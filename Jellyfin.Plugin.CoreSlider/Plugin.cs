using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.Loader;
using Jellyfin.Plugin.CoreSlider.Configuration;
using MediaBrowser.Controller.Configuration;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;

namespace Jellyfin.Plugin.CoreSlider {
    public class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages {
        public override string Name => "Core Slider";
        public override Guid Id => Guid.Parse("3a2c88a1-ed97-43a0-8425-36985ca4491a");

        private readonly ILogger<Plugin> _logger;
        private readonly string? _webPath;
        public string? WebPath {
            get {
                if ( string.IsNullOrWhiteSpace(_webPath) ) { return _webPath; }

                // Check if path exists, if not try linux path
                if ( !Directory.Exists(_webPath) && _webPath.Contains("wwwroot") ) {
                    string linuxPath = _webPath.Replace("wwwroot", "web");
                    if ( Directory.Exists(linuxPath) ) {
                        _logger.LogInformation("Configured web path does not exist, using linux path: {0}", linuxPath);
                        return linuxPath;
                    }
                }

                return _webPath;
            }
        }
        public IServerConfigurationManager ServerConfigurationManager { get; }

        public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer, ILogger<Plugin> logger, IServerConfigurationManager serverConfigurationManager) : base(applicationPaths, xmlSerializer) {
            Instance = this;
            _logger = logger;
            _webPath = applicationPaths.WebPath;
            ServerConfigurationManager = serverConfigurationManager;
        }

        public static Plugin? Instance { get; private set; }

        public void RegisterWithFileTransformation() {
            try {
                var assembly = AssemblyLoadContext.All.SelectMany(ctx => ctx.Assemblies).FirstOrDefault(a => a.FullName != null && a.FullName.Contains("FileTransformation"));

                if ( assembly == null ) {
                    _logger.LogWarning("File Transformation plugin not found.");
                    return;
                }

                var pluginInterfaceType = assembly.GetType("Jellyfin.Plugin.FileTransformation.PluginInterface");
                if ( pluginInterfaceType == null ) { return; }

                var payload = new JObject {
                    ["id"] = Id.ToString(),
                    ["fileNamePattern"] = "index.html",
                    ["callbackAssembly"] = typeof(IndexHtmlHelper).Assembly.FullName,
                    ["callbackClass"] = typeof(IndexHtmlHelper).FullName,
                    ["callbackMethod"] = nameof(IndexHtmlHelper.Transform),
                    ["enabled"] = true
                };

                var registerMethod = pluginInterfaceType.GetMethod("RegisterTransformation");
                registerMethod?.Invoke(null, new object[] { payload });

                _logger.LogInformation("Successfully registered Core Slider with File Transformation.");
            }
            catch (Exception error) {
                _logger.LogError(error, "Failed to register with File Transformation plugin.");
            }
        }

        public IEnumerable<PluginPageInfo> GetPages() {
            var manifestNames = GetType().Assembly.GetManifestResourceNames();
            var htmlPath = manifestNames.FirstOrDefault((path) => path.EndsWith("configPage.html", StringComparison.OrdinalIgnoreCase)) ?? "";

            return new[] {
                new PluginPageInfo {
                    Name = Name,
                    DisplayName = "Core Slider",
                    EnableInMainMenu = true,
                    EmbeddedResourcePath = htmlPath
                }
            };
        }
    }
}
