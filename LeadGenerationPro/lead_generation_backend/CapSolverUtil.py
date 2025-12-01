import capsolver
import asyncio
import requests
from bs4 import BeautifulSoup
import re
from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig

async def solve_captcha_auto(api_key, site_url, site_key=None, captcha_type=None, run_crawler=True):
    capsolver.api_key = api_key
    session_id = None  # <-- always returned

    try:
        html = requests.get(site_url, timeout=10).text
    except Exception as e:
        return {"success": False, "session_id": session_id, "error": str(e)}

    if not captcha_type:
        captcha_type = detect_captcha_type(html)

    # No captcha detected
    if not captcha_type:
        return {
            "success": True,
            "type": "none",
            "session_id": session_id
        }


    if not site_key:
        site_key = extract_site_key(html)

    result = {"type": captcha_type}

    try:
        # Solve captcha
        print(f"Solving captcha of type: {captcha_type}")
        if captcha_type == "recaptcha_v2":
            result["token"] = solve_recaptcha_v2(site_url, site_key)["token"]
        elif captcha_type == "recaptcha_v3":
            result["token"] = solve_recaptcha_v3(site_url, site_key)["token"]
        elif captcha_type == "turnstile":
            result["token"] = solve_turnstile(site_url, site_key)["token"]
        elif captcha_type == "cloudflare_challenge":
            cf = solve_cloudflare(site_url)
            result.update({"cookies": cf["cookies"], "user_agent": cf["user_agent"]})
        elif captcha_type == "aws_waf":
            waf = solve_aws_waf(site_url)
            result.update({"cookies": waf["cookies"]})
        else:
            return {"success": False, "session_id": session_id, "error": "Unknown type"}

        # Optionally run crawler
        print("Running bypass crawler..." if run_crawler else "Skipping crawler run.")
        if run_crawler:
            crawler = await run_bypass_crawler(
                site_url,
                captcha_type,
                token=result.get("token"),
                cookies=result.get("cookies")
            )
            session_id = crawler.get("session_id")
            result["crawler_result"] = crawler

        # Always return success + session_id
        result["success"] = True
        result["session_id"] = session_id
        return result

    except Exception as e:
        return {
            "success": False,
            "session_id": session_id,
            "error": str(e)
        }

def detect_captcha_type(html):
    print("Detecting captcha type...")
    html = html.lower()
    if "recaptcha/api.js" in html and "data-sitekey" in html: return "recaptcha_v2"
    if "recaptcha/api.js?render=" in html: return "recaptcha_v3"
    if "challenges.cloudflare.com" in html: return "turnstile"
    if "cf-challenge" in html or "cf_clearance" in html: return "cloudflare_challenge"
    if "aws-waf" in html or "waf challenge" in html: return "aws_waf"
    return None

def extract_site_key(html):
    print("Extracting site key...")
    soup = BeautifulSoup(html, "html.parser")
    tag = soup.find(attrs={"data-sitekey": True})
    if tag: return tag["data-sitekey"]
    m = re.search(r"['\"]sitekey['\"]\s*:\s*['\"](.+?)['\"]", html) or re.search(r"data-sitekey=['\"](.+?)['\"]", html)
    return m.group(1) if m else None

def solve_recaptcha_v2(site_url, site_key):
    sol = capsolver.solve({"type": "ReCaptchaV2TaskProxyLess", "websiteURL": site_url, "websiteKey": site_key})
    return {"token": sol.get("gRecaptchaResponse")}

def solve_recaptcha_v3(site_url, site_key):
    sol = capsolver.solve({"type": "ReCaptchaV3TaskProxyLess", "websiteURL": site_url, "websiteKey": site_key, "pageAction": "homepage"})
    return {"token": sol.get("gRecaptchaResponse")}

def solve_turnstile(site_url, site_key):
    sol = capsolver.solve({"type": "AntiTurnstileTaskProxyLess", "websiteURL": site_url, "websiteKey": site_key})
    return {"token": sol.get("token")}

def solve_cloudflare(site_url):
    sol = capsolver.solve({"type": "AntiCloudflareTaskProxyLess", "websiteURL": site_url})
    return {"cookies": sol.get("cookies", {}), "user_agent": sol.get("userAgent")}

def solve_aws_waf(site_url):
    sol = capsolver.solve({"type": "AntiAwsWafTaskProxyLess", "websiteURL": site_url})
    return {"cookies": {"aws-waf-token": sol.get("cookie")}}

async def run_bypass_crawler(site_url, captcha_type, token=None, cookies=None):
    session_id = f"bypass_{captcha_type}"
    browser_config = BrowserConfig(verbose=True, headless=True, use_persistent_context=True)

    if cookies:
        browser_config.cookies = [{"name": k, "value": v, "url": site_url} for k, v in cookies.items()]

    async with AsyncWebCrawler(config=browser_config) as crawler:
        run_config = CrawlerRunConfig(js_only=True, cache_mode=CacheMode.BYPASS, session_id=session_id)
        if token:
            run_config.js_code = f"""
            const textarea = document.querySelector('textarea#g-recaptcha-response, input[name="cf-turnstile-response"]');
            if (textarea) {{ textarea.value = "{token}"; }}
            """
        await crawler.arun(url=site_url, config=run_config)
        return {"status": "done", "session_id": session_id}

# LOCAL MAIN TESTING
# if __name__ == "__main__":
#     result = asyncio.run(
#         solve_captcha_auto(
#             api_key="CAP-BA92F348AE81B7F394B902A4C1F9559828C02FE0B9E32A73BF8C08A5C3941E17",
#             site_url="https://stackoverflow.com/nocaptcha",
#             site_key="6Lc5vwgkAAAAAMSJHoiSj7KM-QRV7Em51M8LUk4l",
#             captcha_type="recaptcha_v2"
#         )
#     )
#     print(result)

async def test_captcha():

    api_key = "CAP-BA92F348AE81B7F394B902A4C1F9559828C02FE0B9E32A73BF8C08A5C3941E17"
    site_url = "https://www.google.com/recaptcha/api2/demo"   # Recaptcha V2 demo

    print("Running captcha test...\n")

    result = await solve_captcha_auto(
        api_key=api_key,
        site_url=site_url,
        run_crawler=True     # set True to verify crawler+session
    )

    print("=== CAPTCHA TEST RESULT ===")
    print("Success:", result.get("success"))
    print("Type:", result.get("type"))
    print("Token:", result.get("token"))
    print("Session ID:", result.get("session_id"))
    print("Crawler:", result.get("crawler_result"))
    print("Error:", result.get("error"))
    print("============================\n")

# if __name__ == "__main__":
#     asyncio.run(test_captcha())
