const Core = {
  MAX_DIM: 1200,
  JPEG_QUALITY: 0.82,

  resizeImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > this.MAX_DIM || height > this.MAX_DIM) {
          const ratio = Math.min(this.MAX_DIM / width, this.MAX_DIM / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob(resolve, 'image/jpeg', this.JPEG_QUALITY);
      };
      img.onerror = reject;
      img.src = url;
    });
  },

  blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  },

  async exportCSV() {
    const items = await DbApi.getAllItems();
    return Papa.unparse(items.map(i => ({
      id: i.id,
      name: i.name,
      sku: i.sku || '',
      price: i.price || '',
      description: i.description || '',
      condition: i.condition || '',
      category: i.category || '',
      quantity: i.quantity || 1
    })));
  },

  async importCSV(file) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const rows = results.data;
            for (const row of rows) {
              const item = {
                name: row.name || '',
                sku: row.sku || '',
                price: parseFloat(row.price) || 0,
                description: row.description || '',
                condition: row.condition || '',
                category: row.category || '',
                quantity: parseInt(row.quantity) || 1
              };
              await DbApi.addItem(item);
            }
            resolve(rows.length);
          } catch (e) {
            reject(e);
          }
        },
        error: reject
      });
    });
  }
};
