const Marketplace = {
  async metaCatalogCSV(items) {
    const rows = items.map(i => ({
      'id': i.sku || `item-${i.id}`,
      'title': i.name,
      'description': i.description || i.name,
      'availability': 'in stock',
      'condition': i.condition || 'used',
      'price': `${parseFloat(i.price || 0).toFixed(2)} CAD`,
      'link': '',
      'image_link': '',
      'brand': '',
      'google_product_category': i.category || ''
    }));
    return Papa.unparse(rows);
  },

  kijijiText(items) {
    return items.map(i => {
      const price = parseFloat(i.price || 0).toFixed(2);
      const lines = [
        `Title: ${i.name}`,
        `Price: $${price}`,
        i.condition ? `Condition: ${i.condition}` : '',
        i.category ? `Category: ${i.category}` : '',
        i.sku ? `SKU: ${i.sku}` : '',
        '',
        i.description || '',
        '---'
      ];
      return lines.filter(l => l !== null).join('\n');
    }).join('\n\n');
  },

  craigslistHTML(items) {
    const listings = items.map(i => {
      const price = parseFloat(i.price || 0).toFixed(2);
      return `<div class="listing">
  <h2>${this._esc(i.name)}</h2>
  <p><strong>Price:</strong> $${price}</p>
  ${i.condition ? `<p><strong>Condition:</strong> ${this._esc(i.condition)}</p>` : ''}
  ${i.category ? `<p><strong>Category:</strong> ${this._esc(i.category)}</p>` : ''}
  ${i.sku ? `<p><strong>SKU:</strong> ${this._esc(i.sku)}</p>` : ''}
  ${i.description ? `<p>${this._esc(i.description)}</p>` : ''}
</div>`;
    }).join('\n\n');

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Craigslist Ads</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 700px; margin: 2rem auto; }
  .listing { border: 1px solid #ccc; padding: 1rem; margin-bottom: 1.5rem; border-radius: 4px; }
  h2 { margin-top: 0; }
</style>
</head>
<body>
${listings}
</body>
</html>`;
  },

  _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  async buildZip(items) {
    const zip = new JSZip();

    zip.file('meta_catalog.csv', await this.metaCatalogCSV(items));
    zip.file('kijiji_ads.txt', this.kijijiText(items));
    zip.file('craigslist_ads.html', this.craigslistHTML(items));

    const imgFolder = zip.folder('images');
    const imageRows = await DbApi.getAllImages();
    for (const row of imageRows) {
      const item = items.find(i => i.id === row.id);
      const ext = 'jpg';
      const name = item ? `${item.id}_${item.name.replace(/[^a-z0-9]/gi, '_').substring(0, 30)}.${ext}` : `${row.id}.${ext}`;
      imgFolder.file(name, row.blob);
    }

    return zip.generateAsync({ type: 'blob' });
  }
};
