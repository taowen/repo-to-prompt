# 避免 claude 账号被封

本插件严重依赖 claude 3。很多小伙伴的 claude 账号都被封了。我感觉是 ip 问题

* 自建的 Bandwagon Host 机场，避免和别人共享 IP
* 通过 perplexity 去访问
* 或者用 cloudflare worker 代理去访问 claude api

自建 cloudflare worker 的代码

```js
// Reference: https://developers.cloudflare.com/workers/examples/cors-header-proxy
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
  "Access-Control-Max-Age": "86400",
}
function handleOptions (request) {
  // Make sure the necessary headers are present
  // for this to be a valid pre-flight request
  let headers = request.headers
  if (
          headers.get("Origin") !== null &&
          headers.get("Access-Control-Request-Method") !== null &&
          headers.get("Access-Control-Request-Headers") !== null
  ) {
          // Handle CORS pre-flight request.
          // If you want to check or reject the requested method + headers
          // you can do that here.
          let respHeaders = {
                  ...corsHeaders,
                  // Allow all future content Request headers to go back to browser
                  // such as Authorization (Bearer) or X-Client-Name-Version
                  "Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers"),
          }
          return new Response(null, {
                  headers: respHeaders,
          })
  }
  else {
          // Handle standard OPTIONS request.
          // If you want to allow other HTTP Methods, you can do that here.
          return new Response(null, {
                  headers: {
                          Allow: "GET, HEAD, POST, OPTIONS",
                  },
          })
  }
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    url.host = 'api.anthropic.com';
    let response
    if (request.method === "OPTIONS") {
      response = handleOptions(request)
    }
    else {
      response = await fetch(new Request(url, request))
      response = new Response(response.body, response)
      response.headers.set("Access-Control-Allow-Origin", "*")
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    }
    return response
  }
}
```

如果需要虚拟信用卡给 api 充值，可以用我朋友的这个渠道来买

```
https://gpt.fomepay.com/#/pages/login/index?d=731394

点击上面链接可以用手机注册，如果要开卡的话先在钱包存钱进去，然后选择一张可以开chatGPT或是MJ账号的卡
```