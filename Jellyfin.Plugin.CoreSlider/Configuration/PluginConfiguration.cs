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
        public string Theme { get; set; } = "default";
        public string SlideShadow { get; set; } = "#101010";
        public string SearchType { get; set; } = "Movie,Series";
        public bool LegacySupport { get; set; } = false;

        // Quality
        public int QualityBackdrop { get; set; } = 60;
        public int QualityLogo { get; set; } = 40;

        // Buttons
        public string ButtonTheme { get; set; } = "Default";
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

        // Trailers
        public bool TrailersEnabled { get; set; } = false;
        public bool TrailersYoutube { get; set; } = false;
        public bool TrailersLocal { get; set; } = false;
        public bool TrailersMuted { get; set; } = false;
        public int TrailersInterval { get; set; } = 3000;


        // Load files from CDN
        public string CdnMethod { get; set; } = "JSDelivr";
        public string LocalJsVersion { get; set; } = "1.0.0";
    }
}