//=============================================================================
// 简易随机地图
//=============================================================================

/*:zh
 * @plugindesc 简易随机地图.
 * @author hyrious
 *
 * @help
 *
 * 此插件有以下插件指令:
 *
 * SmallRogue add weight
 * 将下一条场所移动事件添加到「待选列表」, 选中概率 (比重) 为 weight
 *     其中, weight 的格式可以使用以下几种
 *         1  - 整数
 *         v1 - 使用变量 1
 *
 * SmallRogue add weight1,weight2
 * 将下 2 条场所移动事件分别按 weight1, weight2 的比重添加到待选列表, 
 * 用半角逗号, 不要空格, 下 N 条以此类推
 *
 * SmallRogue transfer
 * 立即清空待选列表, 并按比重随机出一条实际执行的场所移动事件
 * 然后, 在已经生成的同模板地图和生成新地图中选择一个作为实际目标地图
 * 对于新地图,
 *     复制一份模板地图, 并分配一个新 mapId, 保存在 $gameSystem 内
 * 对于实际目标地图,
 *     如果目的位置存在事件, 且里面有 SmallRogue 插件指令,
 *     那么这部分指令连同场所移动事件会被替换成返回当前地图的事件
 *
 * SmallRogue push [name]
 * 将已经添加到待选列表的事件连同比重保存到名为 name 的栈中, name 不填默认为空字符串
 *
 * SmallRogue pop [name]
 * 从名为 name 的栈中拿出上一次 push 的待选列表, name 可以不填
 *     上面两个指令 (push, pop) 的一个典型用法是, 可以通过公共事件动态决定待选列表,
 *     普通 add 出来的待选列表在事件开始执行时会清空,
 *     因此可以通过这个指令达到给其他事件发消息的效果
 *
 * 别名:
 * add      -> a, i
 * transfer -> t, call
 * push     -> <<
 * pop      -> >>
 */

void (function SmallRogue() {

    SmallRogue.current = [];
    SmallRogue.stacks = {};

    function fetchNextCommand(self) {
        var command = self._list[self._index + 1];
        self._index++;
        return command;
    }

    function appendCommand(self, command) {
        // append command to list, here
    }

    SmallRogue.add = function(self, rawWeights) {
        // SmallRogue.current.push(...)
        // remove the next command
    };

    SmallRogue.a = SmallRogue.i = SmallRogue.add;

    SmallRogue.transfer = function(self) {
        // append a transfer command
        // $gameSystem.set(mapId, eventId, pageIndex, self._index, target);
        SmallRogue.current = [];
    };

    SmallRogue.t = SmallRogue.call = SmallRogue.transfer;

    SmallRogue.push = function(self, name) {
        name || (name = '_');
        SmallRogue.stacks[name] || (SmallRogue.stacks[name] = []);
        SmallRogue.stacks[name].push(SmallRogue.current);
        SmallRogue.current = [];
    };

    SmallRogue['<<'] = SmallRogue.push;

    SmallRogue.pop = function(self, name) {
        name || (name = '_');
        if (SmallRogue.stacks[name]) {
            var items = SmallRogue.stacks[name].pop();
            if (items) {
                for (var i = 0; i < items.length; i++) {
                    SmallRogue.current.push(items[i]);
                }
            }
        }
    };

    SmallRogue['>>'] = SmallRogue.pop;

    SmallRogue.restore = function(list, eventId, pageIndex) {

    };

    var _setup = Game_Interpreter.prototype.setup;
    Game_Interpreter.prototype.setup = function(list, eventId) {
        list = [].slice.call(list);
        if (this.isOnCurrentMap()) {
            var event = $gameMap.event(eventId);
            SmallRogue.restore(list, eventId, event._pageIndex)
        }
        _setup.call(this, list, eventId);
    };

    var _pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _pluginCommand.call(this, command, args);
        if (command === 'SmallRogue') {
            // args[0] = add, transfer, push, pop
            SmallRogue[args[0]].call(SmallRogue, this, args[1]);
        }
    };

    var _loadMapData = DataManager.loadMapData;
    DataManager.loadMapData = function(mapId) {
        if ($gameSystem._smallRougeMap) {
            var mapData = $gameSystem._smallRougeMap[mapId];
            if (mapData) {
                $dataMap = mapData;
                return;
            }
        }
        _loadMapData.call(DataManager, mapId);
    };
})();
