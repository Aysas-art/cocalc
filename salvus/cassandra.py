
import json, random, sha, uuid
import cql

NODES = []
last_node = -1

# TODO: If possible, maybe this should get updated periodically using
# nodetool (?), in case new nodes are added or removed.

def set_nodes(nodes):
    """input is a list of the cassandra nodes in the cluster"""
    global NODES, last_node
    NODES = nodes
    last_node = random.randrange(len(NODES)) if len(NODES) else -1

# NOTE: There is no multi-host connection pool support at all in the cql python library as of Aug 2012:
#      http://www.mail-archive.com/user@cassandra.apache.org/msg24312.html
# We just use round robin here for now.
def get_node():
    global NODES, last_node
    if len(NODES) == 0: raise RuntimeError("there are no cassandra nodes")
    last_node = (last_node + 1)%len(NODES)
    return NODES[last_node]

def time_to_timestamp(t):
    """Convert a Python time.time()-style value (seconds since Epoch) to milliseconds since Epoch."""
    return int(t*1000)

def timestamp_to_time(t):
    """Convert a Cassandra timestamp to the same units as Python's time.time() returns, which is seconds since the Epoch."""
    return float(t)/1000

pool = {}
def connect(keyspace='salvus', use_cache=True):
    if use_cache and pool.has_key(keyspace):  
        return pool[keyspace]
    for i in range(len(NODES)):
        try:
            node = get_node()
            con = cql.connect(node, keyspace=keyspace, cql_version='3.0.0')
            print "Connected to %s"%node
            pool[keyspace] = con
            return con
        except Exception, msg:
            print msg  # TODO -- logger
    raise RuntimeError("no cassandra nodes are up!! (selecting from %s)"%NODES)

def cursor(keyspace='salvus', use_cache=True):
    return connect(keyspace=keyspace, use_cache=use_cache).cursor()

import signal
def cursor_execute(query, param_dict=None, keyspace='salvus', timeout=1):
    if param_dict is None: param_dict = {}
    def f(*a):
        raise KeyboardInterrupt
    try:
        signal.signal(signal.SIGALRM, f)
        signal.alarm(timeout)
        try:
            cur = cursor(keyspace=keyspace)
            cur.execute(query, param_dict)
        except (KeyboardInterrupt, Exception), msg:
            print msg
            cur = cursor(keyspace=keyspace, use_cache=False)
            cur.execute(query, param_dict)
    finally: 
        signal.signal(signal.SIGALRM, signal.SIG_IGN)
    return cur
       

def keyspace_exists(con, keyspace):
    try:
        con.cursor().execute("use " + keyspace)
        return True
    except cql.ProgrammingError:
        return False

######################################
# create various tables
######################################        

def create_uuid_value_table(cursor):
    cursor.execute("""
CREATE TABLE uuid_value (
     name varchar,
     uuid uuid,
     value varchar,
     PRIMARY KEY(name, uuid)
)
""")


def create_key_value_table(cursor):
    cursor.execute("""
CREATE TABLE key_value (
     name varchar,
     key varchar,
     value varchar,
     PRIMARY KEY(name, key)
)
""")


def create_stateless_exec_table(cursor):
    # TODO: add columns for date time of exec and sage version
    # TODO: is varchar the right type -- maybe blob?
    cursor.execute("""
CREATE TABLE stateless_exec(
     input varchar,
     output varchar)
""")

def create_sage_servers_table(cursor):
    """Create table that tracks Sage servers."""
    cursor.execute("""
CREATE TABLE sage_servers (
    address varchar PRIMARY KEY,
    running boolean
)""")
    # index so we can search for which services are currently running
    cursor.execute("""
CREATE INDEX ON sage_servers (running);
    """)


def create_services_table(cursor):
    """Create table that tracks registered components of salvus."""
    cursor.execute("""
CREATE TABLE services (
    service_id uuid PRIMARY KEY,
    name varchar,
    address varchar,
    port int,
    running boolean,
    username varchar,
    pid int,
    monitor_pid int
)""")

    # index so we can search for which services are currently running
    cursor.execute("""
CREATE INDEX ON services (running);
    """)

    # index so we can search for all services of a given type
    cursor.execute("""
CREATE INDEX ON services (name);
    """)

def create_status_table(cursor):
    """Tracking status of registered components of salvus as they run."""
    cursor.execute("""
CREATE TABLE status (
    service_id uuid,
    time timestamp,
    pmem float,
    pcpu float,
    cputime float,
    vsize int,
    rss int,
    PRIMARY KEY(service_id, time))""")

def create_log_table(cursor):
    cursor.execute("""
CREATE TABLE log (
    service_id uuid,
    time timestamp,
    logfile varchar,
    message varchar,
    PRIMARY KEY(service_id, time))
""")
    

def create_account_tables(cursor=None):
    cursor.execute("""
CREATE TABLE accounts (
    account_id   uuid PRIMARY KEY,
    username     varchar,  
    plan         varchar,  
    prefs        varchar,  
)    
""")
    
    cursor.execute("""
CREATE TABLE account_events (
    account_id   uuid PRIMARY KEY,
    time         timestamp,
    event        varchar,
    value        varchar  
)    
""")

    cursor.execute("""
CREATE TABLE auths (
    account_id   uuid,
    auth         varchar,   
    auth_id      varchar,   
    info         varchar,
    PRIMARY KEY(account_id, auth, auth_id)
)
""")
    

def init_salvus_schema():
    con = connect(keyspace=None)
    cursor = con.cursor()
    if not keyspace_exists(con, 'salvus'):
        cursor.execute("CREATE KEYSPACE salvus WITH strategy_class = 'SimpleStrategy' and strategy_options:replication_factor=3")
        # for when I'm rich:
        #cursor.execute("CREATE KEYSPACE salvus WITH strategy_class = 'NetworkTopologyStrategy' AND strategy_options:DC0 = 3 AND strategy_options:DC1 = 3 and strategy_options:DC2 = 3")
        cursor.execute("USE salvus")
        create_sessions_table(cursor)
        create_key_value_table(cursor)
        create_stateless_exec_table(cursor)
        create_services_table(cursor)
        create_status_table(cursor)
        create_log_table(cursor)
        create_sage_servers_table(cursor)
        create_account_tables(cursor)

##########################################################################
def to_json(x):
    # this format is very important for compatibility with the node client
    return json.dumps(x, separators=(',',':'))
        
##########################################################################
# uuid : JSON value   store
##########################################################################
class UUIDValueStore(object):
    def __init__(self, name):
        self._name = name

    def __len__(self):
        return cursor_execute("SELECT COUNT(*) FROM key_value WHERE name = :name", {'name':self._name}).fetchone()[0]

    def __getitem__(self, uuid):
        c = cursor_execute("SELECT value FROM uuid_value WHERE name = :name AND uuid = :uuid LIMIT 1",
                           {'name':self._name, 'uuid':uuid}).fetchone()
        return json.loads(c[0]) if c else None

    def __setitem__(self, uuid, value):
        if value is None:
            del self[uuid]
        else:
            self.set(uuid, value)

    def set(self, uuid, value, ttl=0):
        cursor_execute("UPDATE uuid_value USING TTL :ttl SET value = :value WHERE name = :name and uuid = :uuid",
                       {'value':to_json(value), 'name':self._name, 'uuid':uuid, 'ttl':ttl})

    def __delitem__(self, uuid):
        cursor_execute("DELETE FROM uuid_value WHERE name = :name AND uuid = :uuid", {'name':self._name, 'uuid':uuid})

    def delete_all(self):
        cursor_execute("DELETE FROM uuid_value WHERE name = :name", {'name':self._name})
        

##########################################################################
# JSON key : JSON value  store
##########################################################################
class KeyValueStore(object):
    def __init__(self, name):
        self._name = name

    def __len__(self):
        return cursor_execute("SELECT COUNT(*) FROM key_value WHERE name = :name", {'name':self._name}).fetchone()[0]

    def _to_json(self, x):
        return json.dumps(x, separators=(',',':'))
        
    def __getitem__(self, key):
        c = cursor_execute("SELECT value FROM key_value WHERE name = :name AND key = :key LIMIT 1",
                           {'name':self._name, 'key':to_json(key)}).fetchone()
        return json.loads(c[0]) if c else None

    def __setitem__(self, key, value):
        if value is None:
            del self[key]
        else:
            self.set(key, value)

    def set(self, key, value, ttl=0):
        cursor_execute("UPDATE key_value USING TTL :ttl SET value = :value WHERE name = :name and key = :key",
                       {'value':to_json(value), 'name':self._name, 'key':to_json(key), 'ttl':ttl})
        
    def __delitem__(self, key):
        cursor_execute("DELETE FROM key_value WHERE name = :name AND key = :key",
                       {'name':self._name, 'key':to_json(key)})

    def delete_all(self):
        cursor_execute("DELETE FROM key_value WHERE name = :name", {'name':self._name})
         


##########################################################################

import cPickle

class StatelessExec(object):
    def hash(self, input):
        return sha.sha(input).hexdigest()

    def __getitem__(self, input):
        c = cursor_execute("SELECT output FROM stateless_exec WHERE input=:input LIMIT 1", 
                 {'input':input}).fetchone()
        if c is not None and len(c) > 0 and c[0] == input:
            return cPickle.loads(str(c[1]))
        
    def __setitem__(self, input, output):
        cursor_execute("UPDATE stateless_exec SET output = :output WHERE input = :input",
                       {'input':input, 'output':cPickle.dumps(output)})
    

##########################################################################
# Sage servers
##########################################################################

from admin import SAGE_PORT
def get_sage_servers():
    return [(address[0], SAGE_PORT) for address in cursor_execute("SELECT address FROM sage_servers WHERE running='true'")]

def record_that_sage_server_started(address):
    cursor().execute("UPDATE sage_servers SET running = 'true' WHERE address = :address", {'address':address})

def record_that_sage_server_stopped(address):
    cursor().execute("UPDATE sage_servers SET running = 'false' WHERE address= :address", {'address':address})
    
    
    


def tokens(n):
    RING_SIZE = 2**127
    return [RING_SIZE / n * x for x in range(n)]
