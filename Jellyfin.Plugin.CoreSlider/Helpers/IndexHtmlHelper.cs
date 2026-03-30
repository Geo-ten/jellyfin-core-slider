using System;
using System.IO;
using Microsoft.Extensions.Logging;
using MediaBrowser.Controller.Configuration;
using MediaBrowser.Common.Net;
using System.Text.Json.Serialization;

namespace Jellyfin.Plugin.CoreSlider {
    public class PatchRequestPayload {
        [JsonPropertyName("contents")]
        public string? Contents { get; set; }
    }

    public static class IndexHtmlHelper {
        private const string Comment = "<!-- CoreSlider -->";

        public static string Transform(PatchRequestPayload payload) {
            try {
                string content = payload.Contents ?? string.Empty;
                if ( string.IsNullOrEmpty(content) ) { return content; }

                if ( content.Contains(Comment) ) { return content; }

                var (css, js) = GetInjectionTags();
                
                return InjectTags(content, css, js);
            } catch {
                return payload?.Contents ?? string.Empty;
            }
        }

        public static void Direct(ILogger logger) {
            logger.LogInformation("Attempting to inject Core Slider script directly into index.html.");

            string? webPath = Plugin.Instance?.WebPath;
            if ( string.IsNullOrWhiteSpace(webPath) ) { return; }

            var file = Path.Combine(webPath, "index.html");
            if ( !File.Exists(file) ) { return; }

            string content = File.ReadAllText(file);

            if ( content.Contains(Comment) ) {
                logger.LogInformation("Core Slider is already injected in {0}", file);
                return;
            }

            var (css, js) = GetInjectionTags();

            string modifiedContent = InjectTags(content, css, js, logger);

            // Don't re-write the file if nothing changed
            if (content.Equals(modifiedContent)) { return; }

            try {
                File.WriteAllText(file, modifiedContent);
                logger.LogInformation("Successfully injected Core Slider into {0}", file);
            } catch (Exception e) {
                logger.LogError(e, "Encountered exception while writing to {0}", file);
            }
        }

        private static string InjectTags(string content, string css, string js, ILogger ? logger = null) {
            // Add CSS before to </head>
            int head = content.LastIndexOf("</head>", StringComparison.OrdinalIgnoreCase);
            if ( head != -1 ) {
                content = content.Insert(head, css);
            }

            // Add JS || CSS before </body>
            int body = content.LastIndexOf("</body>", StringComparison.OrdinalIgnoreCase);

            // Fallback case for CSS
            if ( body != -1 && head == -1 ) {
                content = content.Insert(body, css);
            }

            if ( body != -1 ) {
                content = content.Insert(body, js);
            }
            
            if ( body == -1 && head == -1 && logger != null ) {
                logger.LogWarning("Could not find closing head/body tags");
            }

            return content;
        }

        private static (string css, string js) GetInjectionTags() {
            // If we want to find the files in .dll (Temp closed)

            // string basePath = "";
            // try {
            //     var networkConfig = Plugin.Instance?.ServerConfigurationManager?.GetNetworkConfiguration();

            //     if ( networkConfig != null ) {
            //         var basePathField = networkConfig.GetType().GetProperty("BaseUrl");
            //         var confBasePath = basePathField?.GetValue(networkConfig)?.ToString()?.Trim('/');
            //         if ( !string.IsNullOrEmpty(confBasePath) ) { basePath = $"/{confBasePath}"; }
            //     }
            // } catch {
            //     // Fallback to root
            // }

            // Configuration CDN 
            var config = Plugin.Instance?.Configuration;
            string configCdnMethod = config?.CdnMethod ?? "JSDelivr";
            string configJsVersion = config?.LocalJsVersion ?? "1.0.0";

            // Default value JSDelivr
            string cdn = "https://cdn.jsdelivr.net/gh/Geo-ten/jellyfin-core-slider@main";
            string versionSuffix = "";

            if ( configCdnMethod == "Local" ) { 
                cdn = ".";
                versionSuffix = $"?v={configJsVersion}";
            }

            string cssSource = $"{cdn}/assets/css/core-slider.css{versionSuffix}";
            string jsSource = $"{cdn}/assets/js/core-slider.js{versionSuffix}";

            // Temp RAM (Method)
            if ( configCdnMethod == "Github" ) {
                cdn = "/CoreSlider";
                cssSource = $"{cdn}/core-slider.css";
                jsSource = $"{cdn}/core-slider.js";
            }

            var link = $"<link rel=\"stylesheet\" href=\"{cssSource}\" />\n";
            var script = $"\n{Comment}\n<script defer src=\"{jsSource}\"></script>\n";

            return (link, script);
        }
    }
}