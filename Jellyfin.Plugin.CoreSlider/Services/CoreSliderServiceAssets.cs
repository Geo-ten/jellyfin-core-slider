using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;

namespace Jellyfin.Plugin.CoreSlider.Services {

    public class AssetService {

        private static readonly Dictionary<string, (string content, DateTime fetchedAt)> _cache = new();
        private static readonly TimeSpan _cacheDuration = TimeSpan.FromHours(12);
        private static readonly HttpClient _http = new();

        private const string GithubBase = "https://raw.githubusercontent.com/Geo-ten/jellyfin-core-slider/main";

        public async Task<(string content, string contentType)?> GetAsset(string filename) {
            var config = Plugin.Instance?.Configuration;
            string contentType = filename.EndsWith(".js") ? "application/javascript" : "text/css";

            // Github CDN method
            if ( config?.CdnMethod == "Github" ) {
                return await GetCachedResource(filename, $"{GithubBase}/assets/{(filename.EndsWith(".js") ? "js" : "css")}/{filename}", contentType);
            }

            return null;
        }

        private async Task<(string content, string contentType)?> GetCachedResource(string key, string url, string contentType) {
            if ( _cache.TryGetValue(key, out var cached) && DateTime.UtcNow - cached.fetchedAt < _cacheDuration ) {
                return (cached.content, contentType);
            }

            try {
                var content = await _http.GetStringAsync(url);
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