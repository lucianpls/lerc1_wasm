var LercLayer = L.GridLayer.extend({
  createTile: function (coords, done) {
    var error;
    var tile = L.DomUtil.create('canvas', 'leaflet-tile');
    tile.width = this.options.tileSize;
    tile.height = this.options.tileSize;

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

    // Call wasm
    let retval = Lerc.topixel8(ptrVAL, values.buffer.byteLength, min, max, ptrRGBA);
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
    // let dst = new Uint32Array(imageData.data.buffer, 0, imageData.data.length / 4); // view
    // let src = new Uint32Array(Lerc.HEAP8.buffer, ptrRGBA, imageData.data.length / 4); // view
    // dst.set(src); // copy data

    // This is simpler
    imageData.data.set(new Uint8Array(Lerc.HEAPU8.buffer, ptrRGBA, imageData.data.length));

    ctx.putImageData(imageData, 0, 0);
    Lerc._free(ptrRGBA);
  }
})
