// worker.js - Cloudflare Worker 端 logic (無 hardcode fallback)
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 路由 1: 爬蟲 API Endpoint - /api/netflix-top10
    if (url.pathname === '/api/netflix-top10') {
      try {
        const top10Data = await fetchFlixPatrolHongKongTop10();
        if (!top10Data || top10Data.length === 0) {
          throw new Error('無法解析電影數據');
        }

        return new Response(JSON.stringify(top10Data), {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=3600'
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: '資料未能下載成功', details: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
      }
    }

    // 路由 2: 前端頁面
    return new Response(HTML_CONTENT, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
};

async function fetchFlixPatrolHongKongTop10() {
  const flixUrl = 'https://flixpatrol.com/top10/netflix/hong-kong/';
  const response = await fetch(flixUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  if (!response.ok) throw new Error('無法存取 FlixPatrol 頁面');

  const html = await response.text();
  const movies = [];

  const movieTableMatch = html.match(/TOP 10 Movies[\s\S]*?<tbody[\s\S]*?>([\s\S]*?)<\/tbody>/i);
  
  if (movieTableMatch && movieTableMatch[1]) {
    const tbodyHtml = movieTableMatch[1];
    const titleRegex = /<a[^>]*href="\/title\/[^"]*"[^>]*>([^<]+)<\/a>/g;
    let match;
    let rank = 1;

    while ((match = titleRegex.exec(tbodyHtml)) !== null && rank <= 10) {
      const rawTitle = match[1].trim();
      movies.push({
        rank: rank,
        titleEn: rawTitle,
        titleCn: getChineseTitle(rawTitle),
        poster: getMoviePoster(rawTitle)
      });
      rank++;
    }
  }

  return movies; // 若沒抓到直接回傳空陣列，交由前端觸發錯誤提示
}

function getChineseTitle(enTitle) {
  const dict = {
    'Evil Dead Burn': '鬼玩人：復活',
    'Tomb Raider': '盜墓者羅拉',
    'Animals': '動物大劫案',
    'Kong: Skull Island': '金剛：骷髏島',
    'Lights Out': '切勿關燈',
    'Kung Fu Hustle': '功夫',
    'House of Wax': '恐怖蠟像館',
    'The Purge': '國定殺戮日',
    'Godzilla vs. Kong': '哥斯拉對金剛',
    'The Forever Purge': '無限殺戮日'
  };

  for (let key in dict) {
    if (enTitle.toLowerCase().includes(key.toLowerCase())) return dict[key];
  }
  return enTitle;
}

function getMoviePoster(enTitle) {
  return 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=300&q=80';
}