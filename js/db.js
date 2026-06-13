const DB = new Dexie('AAAASalesInventory');

DB.version(1).stores({
  items: '++id, name, sku, price',
  images: 'id, blob',
  meta: 'key'
});

const DbApi = {
  async addItem(data) {
    return DB.items.add(data);
  },

  async updateItem(id, data) {
    return DB.items.update(id, data);
  },

  async deleteItem(id) {
    await DB.images.delete(id);
    return DB.items.delete(id);
  },

  async getItem(id) {
    return DB.items.get(id);
  },

  async getAllItems() {
    return DB.items.toArray();
  },

  async saveImage(id, blob) {
    return DB.images.put({ id, blob });
  },

  async getImage(id) {
    const row = await DB.images.get(id);
    return row ? row.blob : null;
  },

  async deleteImage(id) {
    return DB.images.delete(id);
  },

  async getAllImages() {
    return DB.images.toArray();
  },

  async clearAll() {
    await DB.items.clear();
    await DB.images.clear();
  }
};
