// scripts/collect-news.mjs
// 지정한 토픽들을 Google 뉴스 RSS에서 검색해 Supabase news 테이블에 저장합니다.

import Parser from "rss-parser";
import { createClient } from "@supabase/supabase-js";

const TOPICS = [
  "방미통위",
  "방통위",
  "방송미디어통신위원회",
  "방미통위 인사",
  "통신시장",
  "마케팅 비용",
  "위약금",
  "단통법",
  "보조금 경쟁",
  "통신 3사",
  "불법스팸",
  "전송자격인증제",
  "인공지능 이용자보호"
  "이용자보호",
  "이용자보호업무평가",
  "신규 가입자",
  "브랜드 메시지",
  "카카오",
  "CI",
  "connecting information",
  "연계정보",
  "본인확인기관",
  "위치정보",
  "통신분쟁",
  "청소년 유해정보",
  "모바일 신분증",
  "전기통신사업법",
  "정보통신망법",
  "개인정보보호법",
];

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const parser = new Parser({ timeout: 15000 });

function buildRssUrl(keyword) {
  const q = encodeURIComponent(keyword);
  return `https://news.google.com/rss/search?q=${q}&hl=ko&gl=KR&ceid=KR:ko`;
}

function extractSource(title = "") {
  const m = title.match(/-\s*([^-]+)$/);
  return m ? m[1].trim() : null;
}

async function collectForTopic(topic) {
  const rssUrl = buildRssUrl(topic);
  let feed;
  try {
    feed = await parser.parseURL(rssUrl);
  } catch (err) {
    console.error(`[${topic}] RSS 조회 실패:`, err.message);
    return;
  }

  const rows = (feed.items || [])
    .slice(0, 20)
    .map((item) => ({
      title: (item.title || "(제목 없음)").trim(),
      url: item.link,
      source: extractSource(item.title),
      published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
      category: topic,
      keywords: [topic],
    }))
    .filter((row) => !!row.url);

  if (rows.length === 0) {
    console.log(`[${topic}] 수집된 기사 없음`);
    return;
  }

  const { error } = await supabase
    .from("news")
    .upsert(rows, { onConflict: "url", ignoreDuplicates: true });

  if (error) {
    console.error(`[${topic}] Supabase 저장 실패:`, error.message);
  } else {
    console.log(`[${topic}] ${rows.length}건 처리 완료`);
  }
}

async function main() {
  for (const topic of TOPICS) {
    await collectForTopic(topic);
    await new Promise((r) => setTimeout(r, 1200));
  }
  console.log("전체 토픽 수집 완료");
}

main().catch((err) => {
  console.error("수집 스크립트 실행 중 오류:", err);
  process.exit(1);
});
