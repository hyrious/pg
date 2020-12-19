// 地图生成 - 原型

// 题:
// 地图上有特殊的「门」事件
// 每个「门」有各种机率通向其他门
// 而且旧地图要记忆化 (可以返回)
// 新地图通过某些模板地图生成

// 解:
// 生成可以只把当前位置的门设置好返回位置, 其他门则在触摸时触发生成
// 生成原理其实是改写移动路线事件, 最好是直接写好移动路线, 从里面选一个留下
// 移动路线的目的地是某个模板地图或普通地图, 可以添加一个配置表示「是模板」
// --------------------------------------------------------------------------

declare var $dataMap: Record<number, any>;
declare var $gameTemp: any;

// 若移动路线目标地图 id 在下面数组里, 则在生成时复制一份地图
var TemplateMapIds = [1, 2, 3];

// 生成 mapId
function generateMapId(id: number) {
  console.assert(TemplateMapIds.includes(id), "generateMapId", id);
  // 我们保存在 $game_ 里, 这样就会存在存档里了 (注意下划线开头的变量不会被存)
  return $gameTemp.generatedMapId++;
}

// 得找个地方把生成的 map 存存档里

// “制作”地图
function makeMap(
  id: number,
  x: number,
  y: number,
  sid: number,
  sx: number,
  sy: number
) {
  console.assert(TemplateMapIds.includes(id), "makeMap", id);
  const newMap = JSON.parse(JSON.stringify($dataMap[id]));
  // 扫描 newMap.events, 把 (x, y) 位置的门设置为返回到 sid 号地图 (sx, sy) 位置
  return newMap;
}

// 注册几个事件命令, 用于添加可选目标和生成地图并执行场所移动
