import { sha1, uuidsha1 } from "@cocalc/backend/sha1";
import getClient from "./client";
import * as qdrant from "@cocalc/database/qdrant";
import { getClient as getDB } from "@cocalc/database/pool";
import checkForAbuse from "./embeddings-abuse";

// the vectors we compute using openai's embeddings api get cached for this long
// in our database since they were last accessed.  Also, this is how long we
// cache our log of calls.
const EXPIRE = "NOW() + interval '6 weeks'";

export interface Data {
  payload: qdrant.Payload;
  field: string; // payload[field] is the text we encode as a vector
}

export async function remove(data: Data[]): Promise<string[]> {
  const points = data.map(({ payload }) => getPointId(payload?.url as string));
  await qdrant.deletePoints({ points });
  return points;
}

export async function save(
  data: Data[],
  account_id: string // who is requesting this, so can log it in case we call openai
): Promise<string[]> {
  // Define the Qdrant points that we will be inserting corresponding
  // to the given data.
  const points: Partial<qdrant.Point>[] = [];
  const point_ids: string[] = [];
  for (const { payload } of data) {
    const point_id = getPointId(payload?.url as string);
    point_ids.push(point_id);
    points.push({ id: point_id, payload });
  }

  // Now we need the vector component of each of these points.
  // These might be available in our cache already, or we
  // might have to compute them by calling openai.
  const input_sha1s: string[] = [];
  const sha1_to_input: { [sha1: string]: string } = {};
  const index_to_sha1: { [n: number]: string } = {};
  let i = 0;
  for (const { field, payload } of data) {
    if (payload == null) {
      throw Error("all payloads must be defined");
    }
    const input = payload[field];
    if (typeof input != "string") {
      throw Error("payload[field] must be a string");
    }
    const s = sha1(input);
    input_sha1s.push(s);
    sha1_to_input[s] = input;
    index_to_sha1[i] = s;
    i += 1;
  }
  // Query database for cached embedding vectors.
  const db = getDB();
  try {
    await db.connect();
    const { rows } = await db.query(
      "SELECT input_sha1,vector FROM openai_embedding_cache WHERE input_sha1 = ANY ($1)",
      [input_sha1s]
    );
    const sha1_to_vector: { [sha1: string]: number[] } = {};
    for (const { input_sha1, vector } of rows) {
      sha1_to_vector[input_sha1] = vector;
    }
    await db.query(
      `UPDATE openai_embedding_cache SET expire=${EXPIRE} WHERE input_sha1 = ANY ($1)`,
      [rows.map(({ input_sha1 }) => input_sha1)]
    );

    if (rows.length < data.length) {
      // compute some embeddings
      const unknown_sha1s = input_sha1s.filter(
        (x) => sha1_to_vector[x] == null
      );
      const inputs = unknown_sha1s.map((x) => sha1_to_input[x]);
      const vectors = await createEmbeddings(db, inputs, account_id);
      for (let i = 0; i < unknown_sha1s.length; i++) {
        sha1_to_vector[unknown_sha1s[i]] = vectors[i];
      }
      // save the vectors in postgres
      await saveEmbeddingsInPostgres(db, unknown_sha1s, vectors);
    }

    // Now sha1_to_vector has *all* the vectors in it.
    points.map((point, i) => {
      point.vector = sha1_to_vector[index_to_sha1[i]];
    });

    await qdrant.upsert(points as qdrant.Point[]);
    return points.map(({ id }) => id as string);
  } finally {
    db.end();
  }
}

// a url, but with no special encoding.
// It must always start with a backslash, which is an affordance
// so we can use qdrant to do prefix substring matching.
export function getPointId(url: string) {
  if (!url || url[0] != "\\" || url.length <= 1) {
    throw Error("url must start with a backslash and be nontrivial");
  }
  return uuidsha1(url);
}

export interface Result {
  id: string | number;
  payload?: qdrant.Payload;
  score?: number; // included for vector search, but NOT for filter search.
}

// - If id is given search for points near the point with that id.
// - If text is given search for points near the embedding of that search text string
// - If neither id or text is given, then the filter must be given, and find
//   points whose payload matches that filter.
// - selector: determines which fields in payload to include/exclude
// - offset: for id/text an integer offset and it reads starting there, just like with SQL;
//           for a filter only search, reads points *AFTER* this id (this is a slight change from the
//           qdrant api to avoid redundant data transfer to client!!).
export async function search({
  id,
  text,
  filter,
  limit,
  selector,
  offset,
  account_id,
}: {
  id?: string; // uuid of a point
  text?: string;
  filter?: object;
  limit: number;
  selector?: { include?: string[]; exclude?: string[] };
  offset?: number | string;
  account_id: string; // who is doing the search, so we can log this
}): Promise<Result[]> {
  if (text != null || id != null) {
    let point_id;
    if (id != null) {
      point_id = id;
    } else {
      const url = `\\search/${text}`;
      // search for points close to text
      [point_id] = await save(
        [
          {
            // time is just to know when this term was last searched, so we could delete stale data if want
            payload: { text, time: Date.now(), url },
            field: "text",
          },
        ],
        account_id
      );
    }
    if (typeof offset == "string") {
      throw Error(
        "when doing a search by text or id, offset must be a number (or not given)"
      );
    }
    return await qdrant.search({
      id: point_id,
      filter,
      limit,
      selector,
      offset,
    });
  } else if (filter != null) {
    // search using the filter *only*.
    // The output of scroll has another property next_page_offset, which
    // would be nice to return somehow, which is of course why it is a different
    // endpoint for qdrant.  Instead, we slightly change how offset works,
    // and discard one result.  At least the waste stays on the server side.
    const { points } = await qdrant.scroll({
      filter,
      limit: offset ? limit + 1 : limit,
      selector,
      offset,
    });
    return offset ? points.slice(1) : points;
  } else {
    throw Error("at least one of id, text or filter MUST be specified");
  }
}

// get embeddings corresponding to strings. This is just a simple wrapper
// around calling openai, and does not cache anything.
async function createEmbeddings(
  db,
  input: string[],
  account_id: string
): Promise<number[][]> {
  await checkForAbuse(account_id);
  // compute embeddings of everythig
  const openai = await getClient();
  const response = await openai.createEmbedding({
    model: "text-embedding-ada-002",
    input,
  });
  const vectors = response.data.data.map((x) => x.embedding);
  // log this
  await db.query(
    `INSERT INTO openai_embedding_log (time,account_id,tokens) VALUES(NOW(),$1,$2)`,
    [account_id, response.data.usage.total_tokens]
  );
  return vectors;
}

async function saveEmbeddingsInPostgres(
  db,
  input_sha1s: string[],
  vectors: number[][]
) {
  if (input_sha1s.length == 0) return;
  // We don't have to worry about sql injection because all the inputs
  // are sha1 hashes and uuid's that we computed.
  // Construct the values string for the query.
  const sha1s = new Set<string>([]);
  const values: string[] = [];
  input_sha1s.forEach((input_sha1, i) => {
    if (sha1s.has(input_sha1)) return;
    sha1s.add(input_sha1);
    values.push(`('${input_sha1}', '{${vectors[i].join(",")}}', ${EXPIRE})`);
  });

  // Insert data into the openai_embedding_cache table using a single query
  const query = `
      INSERT INTO openai_embedding_cache (input_sha1, vector, expire)
      VALUES ${values.join(", ")};
    `;

  await db.query(query);
}
