using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;

namespace Jellyfin.Plugin.CoreSlider.Services {

    public class AssetService {

        private static readonly Dictionary<string, (string content, DateTime fetchedAt)> _cache = new();
        private static readonly TimeSpan _cacheDuration = TimeSpan.FromHours(12);
        private static readonly HttpClient _http = new();

        private const string GithubBase = "https://raw.githubusercontent.com/Geo-ten/jellyfin-core-slider/main";

        public async Task<(string content, string contentType)?> GetAsset(string filename) {
            var webPath = Plugin.Instance?.WebPath;
            var config = Plugin.Instance?.Configuration;
            string contentType = filename.EndsWith(".js") ? "application/javascript" : "text/css";
            string assetFolder = filename.EndsWith(".js") ? "js" : "css";

            // Local method
            if ( config?.CdnMethod == "Local" && !string.IsNullOrEmpty(webPath) ) {
                var localFilePath = Path.Combine(webPath, "assets", assetFolder, filename);
                
                return await GetCachedResource(filename, localFilePath, contentType, "local");
            }

            // Github CDN method
            return await GetCachedResource(filename, $"{GithubBase}/assets/{assetFolder}/{filename}", contentType, "cdn");
        }

        private async Task<(string content, string contentType)?> GetCachedResource(string key, string url, string contentType, string method) {
            if ( _cache.TryGetValue(key, out var cached) && DateTime.UtcNow - cached.fetchedAt < _cacheDuration ) {
                return (cached.content, contentType);
            }

            try {
                string content;

                if ( method == "local" ) {
                    if (!File.Exists(url)) {
                        throw new FileNotFoundException($"Asset not found: {url}");
                    }
                    content = await File.ReadAllTextAsync(url);
                } else {
                    content = await _http.GetStringAsync(url);
                }

                _cache[key] = (content, DateTime.UtcNow);
                return (content, contentType);
            } catch (Exception) {
                if ( _cache.TryGetValue(key, out var stale) ) {
                    return (stale.content, contentType);
                }
                return null;
            }
        }

        public static void ClearCache() {
            _cache.Clear();
        }
    }
}