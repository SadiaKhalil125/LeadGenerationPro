class ScrapeRequest{
    constructor(entity_name, url, container_selector = null, field_mappings, max_items = null, timeout = 15) {
        this.entity_name = entity_name;
        this.url = url;
        this.container_selector = container_selector;
        this.field_mappings = field_mappings;
        this.max_items = max_items;
        this.timeout = timeout;
    }
}
export default ScrapeRequest;
