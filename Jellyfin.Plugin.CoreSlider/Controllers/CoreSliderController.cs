using System;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Jellyfin.Plugin.CoreSlider.Services;

namespace Jellyfin.Plugin.CoreSlider.Controllers {
    
    [ApiController]
    [Route("CoreSlider")]

    // Import resources
    public class CoreSliderController : ControllerBase {
        
        private readonly AssetService _assetService = new();

        [HttpGet("config")]
        [Authorize]
        public ActionResult GetConfiguration() {
            var config = Plugin.Instance?.Configuration;
            if ( config == null ) { return NotFound(); }
            
            return Ok(config);
        }

        [HttpGet("core-slider.css")]
        [AllowAnonymous]
        public async Task<ActionResult> GetCss() {
            var result = await _assetService.GetAsset("core-slider.css");
            if ( result == null ) { return NotFound(); }
            return Content(result.Value.content, result.Value.contentType);
        }

        [HttpGet("core-slider.js")]
        [AllowAnonymous]
        public async Task<ActionResult> GetJavascript() {
            var result = await _assetService.GetAsset("core-slider.js");
            if ( result == null ) { return NotFound(); }
            return Content(result.Value.content, result.Value.contentType);
        }

        [HttpPost("clear-cache")]
        [Authorize]
        public IActionResult ClearCache() {
            AssetService.ClearCache();
            return Ok(new { message = "Cache cleared successfully" });
        }
    }
}
