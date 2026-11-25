import type { Analysis } from "@/lib/schema";

/** Shown before the first upload, clearly labelled as an example. */
export const EXAMPLE: Analysis = {
  item: { is_fashion: true, name: "米白色粗针织开衫", name_en: "Cream chunky-knit cardigan", category: "outer", color: "米白 / 燕麦色", material: "羊毛混纺，粗棒针麻花纹", silhouette: "落肩、微宽松、及臀", season: "秋 · 早春", style_tags: ["斯堪的纳维亚极简", "法式松弛", "Clean fit", "慵懒复古"] },
  pairings: [
    { category: "top", name: "白色修身罗纹背心", name_en: "white ribbed tank", why: "贴身打底和粗针织形成松紧对比，开衫敞穿时露出干净的一条线。" },
    { category: "bottom", name: "浅蓝直筒高腰牛仔裤", name_en: "light wash straight leg jeans", why: "浅牛仔和米白同属低饱和，最不会出错的日常组合。" },
    { category: "skirt", name: "黑色缎面半身长裙", name_en: "black satin slip skirt", why: "缎面的光泽压住针织的毛绒感，软硬质感一冲突就有了时髦度。" },
    { category: "shoes", name: "深棕麂皮乐福鞋", name_en: "brown suede loafers", why: "棕色把燕麦色衬得更暖，乐福鞋让整体偏学院和法式。" },
    { category: "bag", name: "黑色皮质腋下包", name_en: "black leather shoulder bag", why: "一个硬朗的黑色皮件给全身柔软的浅色定住重心。" },
    { category: "accessory", name: "金色粗圈耳环", name_en: "gold chunky hoop earrings", why: "开衫领口低，耳边的金属点亮脸部。" },
  ],
  looks: [
    { title: "周末咖啡", vibe: "scandi clean", pieces: [
      { name: "米白粗针织开衫", name_en: "cream chunky knit cardigan", category: "outer", is_main: true },
      { name: "白色罗纹背心", name_en: "women's white ribbed tank top", category: "top", is_main: false },
      { name: "浅蓝直筒牛仔裤", name_en: "women's light wash straight leg jeans", category: "bottom", is_main: false },
      { name: "白色复古球鞋", name_en: "white retro leather sneakers", category: "shoes", is_main: false },
    ], tip: "开衫只扣中间一颗扣子，露出腰线。" },
    { title: "通勤法式", vibe: "parisian ease", pieces: [
      { name: "米白粗针织开衫", name_en: "cream chunky knit cardigan", category: "outer", is_main: true },
      { name: "黑色缎面长裙", name_en: "black satin midi slip skirt", category: "skirt", is_main: false },
      { name: "深棕麂皮乐福鞋", name_en: "brown suede loafers women", category: "shoes", is_main: false },
      { name: "黑色皮质腋下包", name_en: "black leather shoulder bag", category: "bag", is_main: false },
    ], tip: "把开衫当上衣穿，扣到顶、袖子推到小臂。" },
    { title: "秋日叠穿", vibe: "cozy layering", pieces: [
      { name: "米白粗针织开衫", name_en: "cream chunky knit cardigan", category: "outer", is_main: true },
      { name: "灰色连帽卫衣", name_en: "grey heather hoodie women", category: "top", is_main: false },
      { name: "黑色直筒西裤", name_en: "women's black straight leg trousers", category: "bottom", is_main: false },
      { name: "金色粗圈耳环", name_en: "gold chunky hoop earrings", category: "accessory", is_main: false },
    ], tip: "卫衣帽子翻在开衫领口外，比例更随性。" },
  ],
  creators: [
    { name: "Matilda Djerf", handle: "matildadjerf", platform: "instagram", style: "斯堪的纳维亚极简", why: "针织开衫 + 牛仔几乎是她的招牌搭配。" },
    { name: "Jeanne Damas", handle: "jeannedamas", platform: "instagram", style: "法式复古", why: "开衫配半裙的法式穿法可以直接参考。" },
    { name: "Pernille Teisbaek", handle: "pernilleteisbaek", platform: "instagram", style: "哥本哈根街拍", why: "擅长把粗针织和利落皮件混搭。" },
    { name: "Darja Barannik", handle: "darjabarannik", platform: "instagram", style: "低饱和中性色", why: "米白、燕麦、驼色的同色系穿搭参考。" },
  ],
  searches: [
    { label: "粗针织开衫 OOTD", query: "chunky knit cardigan outfit", hashtag: "cardiganoutfit" },
    { label: "开衫 + 缎面半裙", query: "cardigan satin skirt outfit", hashtag: "satinskirt" },
    { label: "奶油色系秋季穿搭", query: "cream cardigan fall outfit ideas", hashtag: "creamoutfit" },
  ],
};
