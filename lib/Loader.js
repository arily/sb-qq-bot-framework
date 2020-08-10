const runtimeInstaller = require("./runtimeModuleInstaller");
const pluginApplier = require("./pluginLoader").usePlugins;

const path = require("path");
const appDir = path.dirname(require.main.filename);

class Loader {
  constructor(plugins, options) {
    this.plugins = [];
    this.webViews = []
    plugins.map((plugin) => {
      try {
        switch (plugin.type) {
          case "node_module":
            this.loadModule(plugin);
            break;

          case "local":
            this.loadLocalModule(plugin);
          default:
            break;
        }
      } catch (error) {
        console.warn(`Error when loading Module!\n`, error);
      }
    });
    // this.initPluginsWrapper();
    this.options = options;
  }
  initPluginsWrapper() {
    // this.plugins.map(({module,config}) => {
    //     const realApply = module.apply;
    //     module.apply = (ctx) => {
    //         console.log('before initlization',module.name);
    //         return realApply(ctx)
    //     }
    // })
  }
  loadPlugin(plugin, config) {
    switch (typeof plugin) {
      case "object": {
        // if (config.subPlugin) {
        //   plugin = plugin[config.subPlugin];
        // }
        this.plugins.push({ module: plugin, config });
        break;
      }
      case "function":
        this.plugins.push({ module: plugin, config });
        break;
      default: {
        console.log(typeof plugin);
      }
    }
  }
  installToContext(app) {
    const { normal, after } = this.plugins.reduce(
      (acc, cur) => {
        if (!cur.config.priority) cur.config.priority = 0;
        if (cur.config.priority >= 0) {
          acc.normal.push(cur);
        } else {
          acc.after.push(cur);
        }
        return acc;
      },
      {
        normal: [],
        after: [],
      }
    );
    normal.sort((a, b) => b.config.priority - a.config.priority);
    after.sort((a, b) => a.config.priority - b.config.priority);
    const normalWebViews = pluginApplier(app, normal);
    const afterWebViews = pluginApplier(app, after);
    this.webViews.push(...normalWebViews, ...afterWebViews)
  }
  loadModule(plugin) {
    try {
      this.loadPlugin(require(plugin.require), plugin);
    } catch (error) {
      throw error;
    }
  }
  loadLocalModule(plugin) {
    try {
      this.loadPlugin(require(plugin.path), plugin);
    } catch (error) {
      if ((error.code = "MODULE_NOT_FOUND")) {
        try {
          this.loadPlugin(require(`${appDir}/${plugin.path}`), plugin);
        } catch (error) {
          console.warn(
            "make sure that you installed all the requirements in your main app"
          );
          throw error;
        }
      } else {
        console.log("wtf");
        throw error;
      }
    }
  }
}

module.exports = Loader;