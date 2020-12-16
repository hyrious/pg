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
 * 将下 2 条场所移动事件分别按 weight1, weight2 的比重添加到待选列表, 逗号左右不要空格
 * 下 N 条以此类推
 *
 * SmallRogue transfer
 * 立即清空待选列表, 并按比重随机出一条实际执行的场所移动事件
 * 然后, 在已经生成的同模板地图和生成新地图中选择一个作为实际目标地图, 对于新地图,
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
 *     上面两个指令的一个典型用法是, 可以通过公共事件动态决定待选列表,
 *     普通 add 出来的待选列表在事件开始执行时会清空,
 *     因此可以通过这个指令达到给其他事件发消息的效果
 */

void (function SmallRogue() {
    SmallRogue.current = [];
    SmallRogue.stacks = {};

    function fetchNextCommand(interpreter) {
        // get and remove next command from event list...
        // is that event in $dataMap? err...
        // should we dup it first?
    }

    function appendCommand(interpreter, command) {
        // append command to list, here
    }

    SmallRogue.add = function(interpreter, rawWeights) {
        // SmallRogue.current.push(...)
        // remove the next command
    }


    SmallRogue.transfer = function(interpreter) {
        // append a transfer command
    }


    SmallRogue.push = function(interpreter, name) {
        name = name || '';
        // save the next [command, weight] to stacks[name]
    }


    SmallRogue.pop = function(interpreter, name) {
        name = name || '';
        // current.push(...stacks[name].pop())
    }

    var _pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _pluginCommand.call(this, command, args);
        if (command === 'SmallRogue') {
            // args[0] = add, transfer, push, pop
            SmallRogue[args[0]](this, args[1]);
        }
    };
})();
