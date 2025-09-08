class ScrapeResponse{
    constructor(entity_name, url, scraped_at, total_items, data, success, message) {
        this.entity_name = entity_name;
        this.url = url;
        this.scraped_at = scraped_at;
        this.total_items = total_items;
        this.data = data;
        this.success = success;
        this.message = message;
    }
}
export default ScrapeResponse;