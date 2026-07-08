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

            // Fallback for Linux - if wwwroot doesn't exist, try /var/lib/jellyfin/web
            if ( !File.Exists(file) && webPath.Contains("wwwroot") ) {
                string linuxPath = webPath.Replace("wwwroot", "web");
                string linuxFile = Path.Combine(linuxPath, "index.html");
                if ( File.Exists(linuxFile) ) {
                    logger.LogInformation("wwwroot path not found, using linux path: {0}", linuxPath);
                    file = linuxFile;
                }
            }

            if ( !File.Exists(file) ) { return; }

            string content = File.ReadAllText(file);

            var (css, js) = GetInjectionTags();

            // Check if already injected with the SAME content
            bool containsComment = content.Contains(Comment);

            if ( containsComment ) {
                // Fresh injection
                string modifiedContent = InjectTags(content, css, js, logger);

                // Remove old injection first, then re-inject with current config
                content = RemoveOldInjection(content);
            
                // Don't re-write the file if nothing changed
                if ( content.Equals(modifiedContent) ) { return; }

                try {
                    File.WriteAllText(file, modifiedContent);
                    logger.LogInformation("Successfully injected Core Slider into {0}", file);
                } catch (Exception error) {
                    logger.LogError(error, "Encountered exception while writing to {0}", file);
                }
            } else {
                // Fresh injection
                string modifiedContent = InjectTags(content, css, js, logger);

                // Don't re-write the file if nothing changed
                if ( content.Equals(modifiedContent) ) { return; }

                try {
                    File.WriteAllText(file, modifiedContent);
                    logger.LogInformation("Successfully injected Core Slider into {0}", file);
                } catch (Exception error) {
                    logger.LogError(error, "Encountered exception while writing to {0}", file);
                }
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

        private static string RemoveOldInjection(string content) {
            // Find and remove everything from <!-- CoreSlider --> comment through the closing script tag
            int startIndex = content.IndexOf(Comment, StringComparison.OrdinalIgnoreCase);
            if ( startIndex == -1 ) { return content; }

            // Find the matching </script> after the comment
            int endIndex = content.IndexOf("</script>", startIndex, StringComparison.OrdinalIgnoreCase);
            if ( endIndex == -1 ) { return content; }
            
            endIndex += "</script>".Length;

            // Remove the block from the comment to end of script tag
            content = content.Remove(startIndex, endIndex - startIndex);

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
            string cssSource;
            string jsSource;

            if ( configCdnMethod == "Local" ) {
                // Local
                cdn = ".";
                versionSuffix = $"?v={configJsVersion}";
                cssSource = $"{cdn}/assets/css/core-slider.css{versionSuffix}";
                jsSource = $"{cdn}/assets/js/core-slider.js{versionSuffix}";
            } else if ( configCdnMethod == "Github" ) {
                // Github
                cdn = "/CoreSlider";
                cssSource = $"{cdn}/core-slider.css";
                jsSource = $"{cdn}/core-slider.js";
            } else { // JSDelivr (default)
                cssSource = $"{cdn}/assets/css/core-slider.css{versionSuffix}";
                jsSource = $"{cdn}/assets/js/core-slider.js{versionSuffix}";
            }

            var link = $"<link rel=\"stylesheet\" href=\"{cssSource}\" />\n";
            var script = $"\n{Comment}\n<script defer src=\"{jsSource}\"></script>\n";

            return (link, script);
        }
    }
}