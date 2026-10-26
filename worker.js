// worker.js - 部署至 Cloudflare Worker 專用
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 路由 1: 爬蟲 API Endpoint - /api/netflix-top10
    if (url.pathname === '/api/netflix-top10') {
      try {
        const top10Data = await fetchFlixPatrolHongKongTop10();
        return new Response(JSON.stringify(top10Data), {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=3600' // 快取 1 小時以降低請求次數
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message, status: 'failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 路由 2: 前端頁面 - 傳送 HTML 內容
    return new Response(HTML_CONTENT, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
};

// 🕷️ 爬蟲邏輯：抓取 FlixPatrol 香港頁面並解析 Top 10
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

  // 使用正則表達式擷取 TOP 10 Movies 表格內的電影名稱
  const movieTableMatch = html.match(/TOP 10 Movies[\s\S]*?<tbody[\s\S]*?>([\s\S]*?)<\/tbody>/i);
  
  if (movieTableMatch && movieTableMatch[1]) {
    const tbodyHtml = movieTableMatch[1];
    // 匹配 <a> 標籤內的電影標題
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

  // 若解析失敗則回傳預設備用列表
  if (movies.length === 0) return getFallbackTop10();
  return movies;
}

// 字典對照：常用電影繁體中文譯名對照
function getChineseTitle(enTitle) {
  const dict = {
    'Evil Dead Burn': '鬼玩人：復活',
    'Tomb Raider': '盜墓者羅拉',
    'Animals': '動物大劫案',
    'Black Adam': '黑亞當',
    'Erin Brockovich': '永不妥協',
    'Hot Wheels Let\'s Race: Attack of the T-Rex': '風火輪小汽車大冒險',
    'House of Wax': '恐怖蠟像館',
    'Kung Fu Hustle': '功夫',
    'Halloween': '萬聖節驚魂',
    'Kong: Skull Island': '金剛：骷髏島',
    'Lights Out': '切勿關燈',
    'The Purge': '國定殺戮日',
    'Godzilla vs. Kong': '哥斯拉對金剛',
    'The Forever Purge': '無限殺戮日'
  };

  for (let key in dict) {
    if (enTitle.toLowerCase().includes(key.toLowerCase())) {
      return dict[key];
    }
  }
  return enTitle; // 無對照則回傳英文片名
}

// 根據電影名稱派發海報封面 URL
function getMoviePoster(enTitle) {
  const posters = {
    'Evil Dead Burn': 'https://m.media-amazon.com/images/M/MV5BMmZiN2VlNWYtODY2MC00OTA5LThjMGYtN2ViMTM4ZmJjMDAyXkEyXkFqcGc@._V1_SX300.jpg',
    'Tomb Raider': 'https://m.media-amazon.com/images/M/MV5BOTY4NDcyZGEtMTdhYi00NDhiLThlMjEtZThiMGEwZTAzMDAzXkEyXkFqcGc@._V1_SX300.jpg',
    'Animals': 'https://m.media-amazon.com/images/M/MV5BMjA3NzMyMzU1MV5BMl5BanBnXkFtZTgwMjc4NTU5NDM@._V1_SX300.jpg',
    'Kong: Skull Island': 'https://m.media-amazon.com/images/M/MV5BMTUwMzI5ODEwNF5BMl5BanBnXkFtZTgwNjAzNjI2MDI@._V1_SX300.jpg',
    'Lights Out': 'https://m.media-amazon.com/images/M/MV5BNzQ2NTA3MjgyM15BMl5BanBnXkFtZTgwMjA5MzY4ODE@._V1_SX300.jpg',
    'Kung Fu Hustle': 'https://m.media-amazon.com/images/M/MV5BMTkwNzc1NjM3OF5BMl5BanBnXkFtZTcwNTI2Njg3NA@@._V1_SX300.jpg',
    'House of Wax': 'https://m.media-amazon.com/images/M/MV5BMTM3NzA4NDI4MV5BMl5BanBnXkFtZTcwOTEwMTAzMQ@@._V1_SX300.jpg',
    'The Purge': 'https://m.media-amazon.com/images/M/MV5BMTQwMTA5MzI1MF5BMl5BanBnXkFtZTcwMzA5MTA3OQ@@._V1_SX300.jpg',
    'Godzilla vs. Kong': 'https://m.media-amazon.com/images/M/MV5BZmYzMzU4NjctNDI0Mi00MGExLWI3ZDQtYzQzYThjYjkyNmJhXkEyXkFqcGc@._V1_SX300.jpg',
    'The Forever Purge': 'https://m.media-amazon.com/images/M/MV5BMjg4NGRjM2ItY2M2Yi00OTI5LTk0NDgtY2RjZGY0NmI5NzJhXkEyXkFqcGc@._V1_SX300.jpg'
  };

  for (let key in posters) {
    if (enTitle.toLowerCase().includes(key.toLowerCase())) {
      return posters[key];
    }
  }
  return 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=300&q=80';
}

// 備用完整列表數據
function getFallbackTop10() {
  return [
    { rank: 1, titleCn: '鬼玩人：復活', titleEn: 'Evil Dead Burn', poster: 'https://m.media-amazon.com/images/M/MV5BMmZiN2VlNWYtODY2MC00OTA5LThjMGYtN2ViMTM4ZmJjMDAyXkEyXkFqcGc@._V1_SX300.jpg' },
    { rank: 2, titleCn: '盜墓者羅拉', titleEn: 'Tomb Raider', poster: 'https://m.media-amazon.com/images/M/MV5BOTY4NDcyZGEtMTdhYi00NDhiLThlMjEtZThiMGEwZTAzMDAzXkEyXkFqcGc@._V1_SX300.jpg' },
    { rank: 3, titleCn: '動物大劫案', titleEn: 'Animals', poster: 'https://m.media-amazon.com/images/M/MV5BMjA3NzMyMzU1MV5BMl5BanBnXkFtZTgwMjc4NTU5NDM@._V1_SX300.jpg' },
    { rank: 4, titleCn: '金剛：骷髏島', titleEn: 'Kong: Skull Island', poster: 'https://m.media-amazon.com/images/M/MV5BMTUwMzI5ODEwNF5BMl5BanBnXkFtZTgwNjAzNjI2MDI@._V1_SX300.jpg' },
    { rank: 5, titleCn: '切勿關燈', titleEn: 'Lights Out', poster: 'https://m.media-amazon.com/images/M/MV5BNzQ2NTA3MjgyM15BMl5BanBnXkFtZTgwMjA5MzY4ODE@._V1_SX300.jpg' },
    { rank: 6, titleCn: '功夫', titleEn: 'Kung Fu Hustle', poster: 'https://m.media-amazon.com/images/M/MV5BMTkwNzc1NjM3OF5BMl5BanBnXkFtZTcwNTI2Njg3NA@@._V1_SX300.jpg' },
    { rank: 7, titleCn: '恐怖蠟像館', titleEn: 'House of Wax', poster: 'https://m.media-amazon.com/images/M/MV5BMTM3NzA4NDI4MV5BMl5BanBnXkFtZTcwOTEwMTAzMQ@@._V1_SX300.jpg' },
    { rank: 8, titleCn: '國定殺戮日', titleEn: 'The Purge', poster: 'https://m.media-amazon.com/images/M/MV5BMTQwMTA5MzI1MF5BMl5BanBnXkFtZTcwMzA5MTA3OQ@@._V1_SX300.jpg' },
    { rank: 9, titleCn: '哥斯拉對金剛', titleEn: 'Godzilla vs. Kong', poster: 'https://m.media-amazon.com/images/M/MV5BZmYzMzU4NjctNDI0Mi00MGExLWI3ZDQtYzQzYThjYjkyNmJhXkEyXkFqcGc@._V1_SX300.jpg' },
    { rank: 10, titleCn: '無限殺戮日', titleEn: 'The Forever Purge', poster: 'https://m.media-amazon.com/images/M/MV5BMjg4NGRjM2ItY2M2Yi00OTI5LTk0NDgtY2RjZGY0NmI5NzJhXkEyXkFqcGc@._V1_SX300.jpg' }
  ];
}

// 嵌入的前端 HTML 頁面內容
const HTML_CONTENT = `<!DOCTYPE html> ...`; // 請填入下方 index.html 的內容