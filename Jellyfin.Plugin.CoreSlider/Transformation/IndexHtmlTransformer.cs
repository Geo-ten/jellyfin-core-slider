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

    public static class IndexHtmlTransformer {
        private const string Comment = "<!-- CoreSlider -->";

        public static string Transform(PatchRequestPayload payload) {
            try {
                string content = payload.Contents ?? string.Empty;
                if ( string.IsNullOrEmpty(content) ) { return content; }

                if ( content.Contains(Comment) ) { return content; }

                var (css, js) = GetInjectionTags();

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

                return content;
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

            int body = content.LastIndexOf("</body>", StringComparison.OrdinalIgnoreCase);
            if ( body == -1 ) {
                logger.LogWarning("Could not find closing body tag in {0}", file);
                return;
            }

            var (css, js) = GetInjectionTags();

            // Add JS before </body>
            content = content.Insert(body, js);

            // Add CSS before to </head>
            int head = content.LastIndexOf("</head>", StringComparison.OrdinalIgnoreCase);
            if ( head != -1 ) {
                content = content.Insert(head, css);
            }

            try {
                File.WriteAllText(file, content);
                logger.LogInformation("Successfully injected Core Slider into {0}", file);
            } catch (Exception e) {
                logger.LogError(e, "Encountered exception while writing to {0}", file);
            }
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
            bool useCdn = config == null || config.Cdn;
            string cdn = $"https://cdn.jsdelivr.net/gh/Geo-ten/jellyfin-core-slider@main";
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            string versionSuffix = "";

            if ( !useCdn ) { 
                cdn = ".";
                versionSuffix = $"?v={timestamp}";
            }

            string cssSource = $"{cdn}/assets/css/core-slider.css{versionSuffix}";
            string jsSource = $"{cdn}/assets/js/core-slider.js{versionSuffix}";

            var link = $"<link rel=\"stylesheet\" href=\"{cssSource}\" />\n";
            var script = $"\n{Comment}\n<script defer src=\"{jsSource}\"></script>\n";

            return (link, script);
        }
    }
}
