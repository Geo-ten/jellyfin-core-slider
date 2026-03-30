using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.CoreSlider.Configuration {
    public class PluginConfiguration : BasePluginConfiguration {
        // Animation
        public bool AnimationEffectTV { get; set; } = true;
        public bool AnimationEffect { get; set; } = true;

        // General
        public string FileNameLocation { get; set; } = "";
        public int MaxItems { get; set; } = 6;
        public int MaxOverviewLength { get; set; } = 230;
        public int SlideInterval { get; set; } = 12000;
        public int RetryInterval { get; set; } = 1000;
        public string Theme { get; set; } = "default";
        public string SearchType { get; set; } = "Movie,Series";

        // Quality
        public int QualityBackdrop { get; set; } = 60;
        public int QualityLogo { get; set; } = 40;

        // Buttons
        public bool ButtonPlayEnabled { get; set; } = true;
        public string ButtonPlayName { get; set; } = "Play Now";
        public bool ButtonInfoEnabled { get; set; } = true;
        public string ButtonInfoName { get; set; } = "Details";
        public bool ButtonFavoriteEnabled { get; set; } = true;
        public string ButtonFavoriteName { get; set; } = "";

        // Info
        public bool InfoPremiereDate { get; set; } = true;
        public bool InfoGenre { get; set; } = true;
        public bool InfoAgeRating { get; set; } = true;
        public bool InfoRuntime { get; set; } = true;
        public bool InfoStarRating { get; set; } = true;

        // Load files from CDN
        public bool Cdn { get; set; } = true;
    }
}