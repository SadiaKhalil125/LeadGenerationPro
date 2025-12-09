import asyncio
from playwright.async_api import async_playwright
from fake_useragent import UserAgent

class ScraperEngine:
    def __init__(self):
        self.ua = UserAgent()

    async def get_child_selectors(self, url: str, container_selector: str):
        """
        Navigates to URL, finds the container, and returns a list of unique 
        CSS selectors (tag.class) for all elements inside that container.
        """
        async with async_playwright() as p:
            # 1. STEALTH: Random User Agent
            user_agent = self.ua.random
            
            # 2. STEALTH: Chromium Flags to hide automation
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    '--disable-blink-features=AutomationControlled',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-infobars',
                    '--window-position=0,0',
                    '--ignore-certificate-errors',
                ]
            )

            # 3. STEALTH: Browser Context (Viewport, Locale, Permissions)
            context = await browser.new_context(
                user_agent=user_agent,
                viewport={'width': 1920, 'height': 1080},
                locale='en-US',
                timezone_id='America/New_York',
                permissions=['geolocation'],
                java_script_enabled=True
            )

            # 4. STEALTH: Remove navigator.webdriver property
            await context.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                });
            """)

            page = await context.new_page()

            try:
                # Navigate
                await page.goto(url, wait_until='domcontentloaded', timeout=30000)
                
                # Wait for container
                try:
                    await page.wait_for_selector(container_selector, state='attached', timeout=10000)
                except:
                    # If container not found, return empty list
                    return []

                # Extract Selectors Logic
                # This script runs in the browser, finds children, and builds "tag.class" strings
                selectors = await page.evaluate(f"""
                    () => {{
                        const container = document.querySelector('{container_selector}');
                        if (!container) return [];
                        
                        // Get all descendants
                        const elements = container.querySelectorAll('*');
                        const uniqueSelectors = new Set();
                        
                        elements.forEach(el => {{
                            let selector = el.tagName.toLowerCase();
                            
                            // Add classes if they exist
                            if (el.classList.length > 0) {{
                                const classes = Array.from(el.classList)
                                    .filter(c => c && c.trim() !== '') // Filter empty
                                    .join('.');
                                if(classes) {{
                                    selector += '.' + classes;
                                }}
                            }}
                            uniqueSelectors.add(selector);
                        }});
                        
                        return Array.from(uniqueSelectors).sort();
                    }}
                """)
                
                return selectors

            except Exception as e:
                print(f"Scraping Error: {e}")
                raise e
            finally:
                await browser.close()