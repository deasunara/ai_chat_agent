/**
 * Japanese Kana Dataset (Hiragana & Katakana)
 * For SakuraSensei Interactive Kana Chart & Practice
 */

const KANA_DATA = {
  vowels: ['a', 'i', 'u', 'e', 'o'],
  rows: [
    {
      name: 'Vowels',
      romaji: ['', 'k', 's', 't', 'n', 'h', 'm', 'y', 'r', 'w', 'n*'],
      hiragana: [
        { h: 'あ', k: 'ア', r: 'a' },
        { h: 'い', k: 'イ', r: 'i' },
        { h: 'う', k: 'ウ', r: 'u' },
        { h: 'え', k: 'エ', r: 'e' },
        { h: 'お', k: 'オ', r: 'o' }
      ]
    },
    {
      name: 'K-Row (か行)',
      hiragana: [
        { h: 'か', k: 'カ', r: 'ka' },
        { h: 'き', k: 'キ', r: 'ki' },
        { h: 'く', k: 'ク', r: 'ku' },
        { h: 'け', k: 'ケ', r: 'ke' },
        { h: 'こ', k: 'コ', r: 'ko' }
      ]
    },
    {
      name: 'S-Row (さ行)',
      hiragana: [
        { h: 'さ', k: 'サ', r: 'sa' },
        { h: 'し', k: 'シ', r: 'shi' },
        { h: 'す', k: 'ス', r: 'su' },
        { h: 'せ', k: 'セ', r: 'se' },
        { h: 'そ', k: 'ソ', r: 'so' }
      ]
    },
    {
      name: 'T-Row (た行)',
      hiragana: [
        { h: 'た', k: 'タ', r: 'ta' },
        { h: 'ち', k: 'チ', r: 'chi' },
        { h: 'つ', k: 'ツ', r: 'tsu' },
        { h: 'て', k: 'テ', r: 'te' },
        { h: 'と', k: 'ト', r: 'to' }
      ]
    },
    {
      name: 'N-Row (な行)',
      hiragana: [
        { h: 'な', k: 'ナ', r: 'na' },
        { h: 'に', k: 'ニ', r: 'ni' },
        { h: 'ぬ', k: 'ヌ', r: 'nu' },
        { h: 'ね', k: 'ネ', r: 'ne' },
        { h: 'の', k: 'ノ', r: 'no' }
      ]
    },
    {
      name: 'H-Row (は行)',
      hiragana: [
        { h: 'は', k: 'ハ', r: 'ha' },
        { h: 'ひ', k: 'ヒ', r: 'hi' },
        { h: 'ふ', k: 'フ', r: 'fu' },
        { h: 'へ', k: 'ヘ', r: 'he' },
        { h: 'ほ', k: 'ホ', r: 'ho' }
      ]
    },
    {
      name: 'M-Row (ま行)',
      hiragana: [
        { h: 'ま', k: 'マ', r: 'ma' },
        { h: 'み', k: 'ミ', r: 'mi' },
        { h: 'む', k: 'ム', r: 'mu' },
        { h: 'め', k: 'メ', r: 'me' },
        { h: 'も', k: 'モ', r: 'mo' }
      ]
    },
    {
      name: 'Y-Row (や行)',
      hiragana: [
        { h: 'や', k: 'ヤ', r: 'ya' },
        { h: '　', k: '　', r: '' },
        { h: 'ゆ', k: 'ユ', r: 'yu' },
        { h: '　', k: '　', r: '' },
        { h: 'よ', k: 'ヨ', r: 'yo' }
      ]
    },
    {
      name: 'R-Row (ら行)',
      hiragana: [
        { h: 'ら', k: 'ラ', r: 'ra' },
        { h: 'り', k: 'リ', r: 'ri' },
        { h: 'る', k: 'ル', r: 'ru' },
        { h: 'れ', k: 'レ', r: 're' },
        { h: 'ろ', k: 'ロ', r: 'ro' }
      ]
    },
    {
      name: 'W & N (わ・を・ん)',
      hiragana: [
        { h: 'わ', k: 'ワ', r: 'wa' },
        { h: '　', k: '　', r: '' },
        { h: 'を', k: 'ヲ', r: 'wo' },
        { h: '　', k: '　', r: '' },
        { h: 'ん', k: 'ン', r: 'n' }
      ]
    },
    {
      name: 'Dakuten (が・ざ・だ・ば)',
      hiragana: [
        { h: 'が', k: 'ガ', r: 'ga' },
        { h: 'ぎ', k: 'ギ', r: 'gi' },
        { h: 'ぐ', k: 'グ', r: 'gu' },
        { h: 'げ', k: 'ゲ', r: 'ge' },
        { h: 'ご', k: 'ゴ', r: 'go' }
      ]
    },
    {
      name: 'Handakuten (ぱ・ぴ・ぷ・ぺ・ぽ)',
      hiragana: [
        { h: 'ぱ', k: 'パ', r: 'pa' },
        { h: 'ぴ', k: 'ピ', r: 'pi' },
        { h: 'ぷ', k: 'プ', r: 'pu' },
        { h: 'ぺ', k: 'ペ', r: 'pe' },
        { h: 'ぽ', k: 'ポ', r: 'po' }
      ]
    }
  ]
};

// Common Japanese Quick Phrases for Learners
const QUICK_PHRASES = [
  { jp: 'おはようございます', romaji: 'Ohayou gozaimasu', id: 'Selamat pagi (sopan)' },
  { jp: 'こんにちは', romaji: 'Konnichiwa', id: 'Selamat siang / Halo' },
  { jp: 'こんばんは', romaji: 'Konbanwa', id: 'Selamat malam' },
  { jp: 'ありがとうございます', romaji: 'Arigatou gozaimasu', id: 'Terima kasih banyak' },
  { jp: 'すみません', romaji: 'Sumimasen', id: 'Permisi / Maaf' },
  { jp: 'いただきます', romaji: 'Itadakimasu', id: 'Selamat makan' },
  { jp: 'ごちそうさまでした', romaji: 'Gochisousama deshita', id: 'Terima kasih atas hidangannya' },
  { jp: 'はじめまして', romaji: 'Hajimemashite', id: 'Salam kenal' },
  { jp: 'よろしくお願いします', romaji: 'Yoroshiku onegaishimasu', id: 'Mohon bantuannya' },
  { jp: 'お元気ですか？', romaji: 'Ogenki desu ka?', id: 'Apa kabar?' }
];

// Recommended Ollama Models for Japanese
const RECOMMENDED_MODELS = [
  { id: 'qwen2.5:7b', name: 'Qwen 2.5 (7B)', desc: 'Sangat direkomendasikan untuk bahasa Jepang & Asia', tag: 'Top Choice' },
  { id: 'qwen2.5:3b', name: 'Qwen 2.5 (3B)', desc: 'Ringan, cepat, sangat bagus untuk laptop biasa', tag: 'Fast' },
  { id: 'llama3.2:3b', name: 'Llama 3.2 (3B)', desc: 'Model efisien terbaru dari Meta', tag: 'Popular' },
  { id: 'llama3.1:8b', name: 'Llama 3.1 (8B)', desc: 'Kaya pemahaman tata bahasa & konteks', tag: 'Balanced' },
  { id: 'mistral:7b', name: 'Mistral (7B)', desc: 'Model serba guna dan handal', tag: 'Standard' },
  { id: 'gemma2:2b', name: 'Gemma 2 (2B)', desc: 'Ultra-ringan buatan Google', tag: 'Lightweight' }
];

window.KANA_DATA = KANA_DATA;
window.QUICK_PHRASES = QUICK_PHRASES;
window.RECOMMENDED_MODELS = RECOMMENDED_MODELS;
