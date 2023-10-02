import { ISerializers, WidgetModel } from "@jupyter-widgets/base";
import { version } from "k3d";
import * as serialize from "./serialize";
import { runOnEveryPlot } from "./util";
import { objects, plots } from "./state";

export default class ObjectModel extends WidgetModel {
  defaults() {
    return {
      ...super.defaults(),
      _model_name: "ObjectModel",
      _view_name: "ObjectView",
      _model_module: "k3d",
      _view_module: "k3d",
      _model_module_version: version,
      _view_module_version: version,
    };
  }

  initialize(...args) {
    super.initialize.apply(this, args);

    this.on("change", this._change, this);
    this.on(
      "msg:custom",
      (msg) => {
        if (msg.msg_type === "fetch") {
          const property = this.get(msg.field);

          if (property.data && property.shape) {
            property.compression_level = this.attributes.compression_level;
          }

          this.save(msg.field, property);
        }

        if (
          msg.msg_type === "shadow_map_update" &&
          this.get("type") === "Volume"
        ) {
          runOnEveryPlot(this.get("id"), (plot, objInstance) => {
            if (objInstance?.refreshLightMap) {
              objInstance.refreshLightMap(msg.direction);
              plot.K3DInstance.render();
            }
          });
        }
      },
      this,
    );

    // console.log("object-model.initialize", args);
    // CRITICAL: do NOT do the set until both id and type
    // are both set.  I guess sometimes multiple incomplete
    // versions of the object get created.   I didn't have
    // the args[0].type check here (and in set below),
    // which was the root cause of
    //    https://github.com/sagemathinc/cocalc/issues/6867
    if (args[0].id && args[0].type) {
      objects[args[0].id] = this;
    }
  }

  set(...args) {
    // We do the set of objects here rather than in the initialize above
    // (like it is done upstream) because our widget manager doesn't
    // pass in the serialized state on construction, due to complexities
    // involving realtime sync.

    // don't touch without reading the comment above about args[0].type!
    if (args[0].id != null && args[0].type) {
      objects[args[0].id] = this;
    }
    super.set.apply(this, args);
  }

  _change(c) {
    for (const plot of plots) {
      plot.refreshObject(this, c.changed);
    }
  }

  static serializers: ISerializers = {
    ...WidgetModel.serializers,
    model_matrix: serialize,
    positions: serialize,
    scalar_field: serialize,
    alpha_coef: serialize,
    shadow: serialize,
    shadow_res: serialize,
    shadow_delay: serialize,
    ray_samples_count: serialize,
    focal_plane: serialize,
    focal_length: serialize,
    gradient_step: serialize,
    color_map: serialize,
    samples: serialize,
    color_range: serialize,
    attribute: serialize,
    triangles_attribute: serialize,
    vertices: serialize,
    indices: serialize,
    colors: serialize,
    origins: serialize,
    vectors: serialize,
    opacity: serialize,
    opacities: serialize,
    point_sizes: serialize,
    point_size: serialize,
    width: serialize,
    shader: serialize,
    wireframe: serialize,
    radial_segments: serialize,
    color: serialize,
    flat_shading: serialize,
    heights: serialize,
    mesh_detail: serialize,
    voxels: serialize,
    voxels_group: serialize,
    sparse_voxels: serialize,
    space_size: serialize,
    volume: serialize,
    opacity_function: serialize,
    text: serialize,
    texture: serialize,
    binary: serialize,
    size: serialize,
    position: serialize,
    puv: serialize,
    visible: serialize,
    uvs: serialize,
    volume_bounds: serialize,
    spacings_x: serialize,
    spacings_y: serialize,
    spacings_z: serialize,
  };
}
