import filter from 'leo-profanity'
import FILIPINO from '.filipino-badwords.json'

// Basic “leet” and symbol normalization so b1tch/b!tch etc. are caught
const L33T_MAP = {
  '0':'o','1':'i','2':'z','3':'e','4':'a','5':'s','6':'g','7':'t','8':'b','9':'g',
  '@':'a','$':'s','!':'i','€':'e','£':'l','¥':'y','§':'s'
}

export const normalizeText = (txt = '') =>
  txt
    .toLowerCase()
    // convert common substitutions
    .replace(/[0123456789@\$!€£¥§]/g, (c) => L33T_MAP[c] || c)
    // drop most punctuation (keep letters incl. accents + spaces)
    .replace(/[^a-z\u00c0-\u024f\u1e00-\u1eff\s]/gi, ' ')
    // collapse long repeats: heeelll -> heell
    .replace(/(.)\1{2,}/g, '$1$1')
    .trim()

// Call once on app start (or component mount)
export const initProfanity = () => {
  filter.reset()
  filter.loadDictionary('en') // built-in English list
  filter.add(FILIPINO) // Filipino bad words

  filter.addWhitelist([
    // English safe words
    'class', 'classic', 'pass', 'assembly', 'bass',
    'Scunthorpe', 'assess', 'passage', 'grass', 'assistant',

    // Filipino safe words
    'tanggap', 'tanggapan', 'magagandang', 'pukis', 'bago',
    'hayop na cute',
  ])
}

// true if text contains profanity (after normalization)
export const containsProfanity = (txt) => filter.check(normalizeText(txt))

// turn bad words into asterisks (if you prefer cleaning vs blocking)
export const cleanProfanity = (txt) => filter.clean(normalizeText(txt))
