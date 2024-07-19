var LercLayer = L.GridLayer.extend({
  createTile: function (coords, done) {
    var error;
    var tile = L.DomUtil.create('canvas', 'leaflet-tile');
    tile.width = this.options.tileSize;
    tile.height = this.options.tileSize;

    var xhr = new XMLHttpRequest();
    xhr.responseType = "arraybuffer";
    var url = 'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/' + 'Terrain3D/ImageServer/tile/' + coords.z + '/' + coords.y + '/' + coords.x;

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
    let min = slider.noUiSlider.get()[0];
    let max = slider.noUiSlider.get()[1];
    let values = tile.decodedPixels.data;
    let ctx = tile.getContext('2d');
    let imageData = ctx.createImageData(width, height);
    let pixels = new Uint32Array(imageData.data.buffer, 0, imageData.data.length / 4); // view
    let f = 255 / (max - min);
    let ALPHA = 0xff000000;
    for (let i = 0; i < width * height; i++) {
      // Skip the last pixel in each input line
      let j = i + Math.floor(i / width);
      // Clipped to min-max
      let pv = f * (values[j] - min);
      pv = Math.min(255, Math.max(0, pv)) & 0xff;
      pixels[i] = (pv * 0x10101) | ALPHA;
    }
    ctx.putImageData(imageData, 0, 0);
  }
})
