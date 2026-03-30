using System;
using System.Linq;
using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.CoreSlider.Controller {
    
    [ApiController]
    [Route("CoreSlider")]
    public class CoreSliderController : ControllerBase {
        
        [HttpGet("core-slider.js")]
        [Produces("application/javascript")]
        [AllowAnonymous]
        public ActionResult GetJavascript() {
            return GetResource("core-slider.js", "application/javascript");
        }

        [HttpGet("core-slider.css")]
        [Produces("text/css")]
        [AllowAnonymous]
        public ActionResult GetCss() {
            return GetResource("core-slider.css", "text/css");
        }

        // Import resources from .dll
        private ActionResult GetResource(string filename, string contentType) {
            var assembly = Assembly.GetExecutingAssembly();
            var targetResource = assembly.GetManifestResourceNames().FirstOrDefault((path) => path.EndsWith(filename, StringComparison.OrdinalIgnoreCase));
            
            if ( string.IsNullOrEmpty(targetResource) ) {
                return NotFound($"/* File '{filename}' not found */");
            }

            var stream = assembly.GetManifestResourceStream(targetResource);
            if ( stream == null ) { return NotFound(); }
            
            return File(stream, contentType);
        }
    }
}
