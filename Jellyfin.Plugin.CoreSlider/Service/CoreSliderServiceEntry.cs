using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.CoreSlider {
    public class CoreSliderServiceEntry : IHostedService {
        private readonly ILogger<CoreSliderServiceEntry> _logger;
        private readonly IHostApplicationLifetime _appLifetime;

        public CoreSliderServiceEntry(ILogger<CoreSliderServiceEntry> logger, IHostApplicationLifetime appLifetime) {
            _logger = logger;
            _appLifetime = appLifetime;
        }

        public Task StartAsync(CancellationToken cancellationToken) {
            _logger.LogInformation("Core Slider Entry Point is starting...");
            
            // Direct Injection
            IndexHtmlTransformer.Direct(_logger);

            // Wait for Jellyfin to loads, then run FileTransformation
            _appLifetime.ApplicationStarted.Register(() => {
                Plugin.Instance?.RegisterWithFileTransformation();
            });
            
            return Task.CompletedTask;
        }

        public Task StopAsync(CancellationToken cancellationToken) {
            return Task.CompletedTask;
        }
    }
}
