using MediaBrowser.Controller;
using MediaBrowser.Controller.Plugins;
using Microsoft.Extensions.DependencyInjection;

namespace Jellyfin.Plugin.CoreSlider {
    public class CoreSliderServiceRegistrator : IPluginServiceRegistrator {
        public void RegisterServices(IServiceCollection serviceCollection, IServerApplicationHost applicationHost) {
            // Register Service Entry as Hosted Service
            serviceCollection.AddHostedService<CoreSliderServiceEntry>();
        }
    }
}