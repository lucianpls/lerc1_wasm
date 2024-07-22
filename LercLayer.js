var LercLayer = L.GridLayer.extend({
  createTile: function (coords, done) {
    var error;
    var tile = L.DomUtil.create('canvas', 'leaflet-tile');
    tile.width = this.options.tileSize;
    tile.height = this.options.tileSize;
    tile.zoom = coords.z;

    var xhr = new XMLHttpRequest();
    xhr.responseType = "arraybuffer";
    // var url = 'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/' + 'Terrain3D/ImageServer/tile/' + coords.z + '/' + coords.y + '/' + coords.x;
    var url = 'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/' + 'TopoBathy3D/ImageServer/tile/' + coords.z + '/' + coords.y + '/' + coords.x;

    xhr.open("Get", url, true);
    xhr.send();

    // var that = this;

    xhr.onreadystatechange = function (evt) {
      if (evt.target.readyState == 4 && evt.target.status == 200) {
        tile.decodedPixels = Lerc.decode(new Uint8Array(xhr.response));
        if (tile.decodedPixels)
          this.draw(tile);
        else
          error = "Unrecognized data";
        done(error, tile);
      }
    }.bind(this);
    
    return tile;
  },

  draw: function (tile) {
    
    let width = tile.decodedPixels.width - 1;
    let height = tile.decodedPixels.height - 1;
    let min = +slider.noUiSlider.get()[0];
    let max = +slider.noUiSlider.get()[1];
    let values = tile.decodedPixels.data;

    let ptrVAL = Lerc._malloc(values.buffer.byteLength);
    let ptrRGBA = Lerc._malloc(width * height * 4);

    // Copy the data to wasm
    // writeArray only works with 8bit arrays
    // Lerc.writeArrayToMemory(new Uint8Array(values.buffer, 0, values.buffer.byteLength), ptrVAL);
    // This is direct, the HEAP has multiple views as different types, the offsets have to be adjusted
    Lerc.HEAPF32.set(values, ptrVAL / 4);

    // Call wasm to convert it to streched RGBAt
    let retval = Lerc.topixel8(ptrVAL, values.buffer.byteLength, min, max, ptrRGBA);
    if (0 == retval) {
      console.log("Error converting");
      // Free the buffers for now
      Lerc._free(ptrVAL);
      Lerc._free(ptrRGBA);
      return; // ??
    }

    // Apply a palette if defined
    if (this.palette) {
      let ppal = Lerc._malloc(256 * 4);
      Lerc.HEAPU32.set(this.palette, ppal / 4);
      retval = Lerc.applypalette(ppal, ptrRGBA, width * height);
      Lerc._free(ppal);
    }

    // Hillshade needs to know pixel size
    // Comment out these three lines to skip hillshade
    let pixel_size = 40_000_000 * (2 ** (-8 -tile.zoom));
    let sun_angle = +this.sunAngle / 180 * Math.PI || Math.PI / 4;
    retval = Lerc.hillshade(ptrVAL, values.buffer.byteLength, pixel_size, sun_angle, ptrRGBA);

    if (0 == retval) {
      console.log("Error converting");
      // Free the buffers for now
      Lerc._free(ptrVAL);
      Lerc._free(ptrRGBA);
      return; // ??
    }

    // Done with the input copy
    Lerc._free(ptrVAL);

    // display the RGBA image
    let ctx = tile.getContext('2d');
    let imageData = ctx.createImageData(width, height);

    // Copy the RGBA pixels from wasm to imageData.data
    new Uint32Array(imageData.data.buffer).set(
      new Uint32Array(Lerc.HEAP8.buffer, ptrRGBA, imageData.data.length / 4)); // view

    // This looks simpler, although it might trigger the clamping
    // imageData.data.set(new Uint8Array(Lerc.HEAPU8.buffer, ptrRGBA, imageData.data.length));

    ctx.putImageData(imageData, 0, 0);
    Lerc._free(ptrRGBA);
  },

  // Build a palette by linear interpolation beween points
  buildPalette : function(points)
  {
    let palette = new Uint32Array(256);

    let j = -1;
    let slope = 0;
    for (let i = 0; i < 256; i++) {
      if (i == 0 || points.index[j + 1] < i) {
        j++;
        let f = 1 / (points.index[j + 1] - points.index[j]);
        slope = {
          red : f * ((points.values[j+1] & 0xff) - (points.values[j] & 0xff)),
          green : f * (((points.values[j+1] >> 8) & 0xff) - ((points.values[j] >> 8) & 0xff)),
          blue : f *(((points.values[j+1] >> 16) & 0xff) - ((points.values[j] >> 16) & 0xff)),
          alpha : f * (((points.values[j+1] >> 24) & 0xff) - ((points.values[j] >> 24) & 0xff)),
        }
      }

      // i is between j and j+1
      let l = i - points.index[j];
      let v = points.values[j];
      red = 0xff & ((v & 0xff) + l * slope.red);
      green = 0xff & (((v >> 8) & 0xff) + l * slope.green);
      blue = 0xff & (((v >> 16) & 0xff) + l * slope.blue);
      alpha = 0xff & (((v >> 24) & 0xff) + l * slope.alpha);
      palette[i] = (alpha << 24) | (blue << 16) | (green << 8) | red;
    };
    return palette;
  }
  
})
