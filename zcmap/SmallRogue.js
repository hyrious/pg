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
 * 注意: push, pop 不存在 "记忆化" -- 保存游戏再读取就会丢失所有 push 过的信息
 *
 * 别名:
 * add      -> a, i
 * transfer -> t, call
 * push     -> <<
 * pop      -> >>
 */

/**
 * @example
 * var map = new SmallRogueMap()
 * map.get(mapId, eventId, pageIndex, index);
 * map.set(mapId, eventId, pageIndex, index, command);
 */
class SmallRogueMap {
    constructor() {
        this.currentMapId = 3000;
        this.data = {};
    }
    key() {
        return Array.prototype.slice.call(arguments).join();
    }
    get() {
        var key = this.key.apply(this, arguments);
        return this.data[key];
    }
    set() {
        var args = Array.prototype.slice.call(arguments);
        var value = args.pop();
        var key = this.key.apply(this, args);
        this.data[key] = value;
        return value;
    }
    forEach(handler) {
        for (var key in this.data) {
            var value = this.data[key];
            handler(value, key);
        }
    }
}

// $gameSystem.getSmallRogueMap()
Game_System.prototype.getSmallRogueMap = function() {
    this.smallRogueMap || (this.smallRogueMap = new SmallRogueMap());
    if (!(this.smallRogueMap instanceof SmallRogueMap)) {
        this.smallRogueMap['__proto__'] = SmallRogueMap.prototype;
    }
    return this.smallRogueMap;
};

void (function SmallRogue() {

    SmallRogue.current = [];
    SmallRogue.stacks = {};

    var err;
    SmallRogue.err = err = {
        invalidInteger: 'Invalid weight at {loc}. Expect integer, got {arg}.',
        invalidTransferEvent: 'Invalid event at {loc}. Expect transfer event, got {arg}.',
        invalidMapId: 'Invalid mapId at {loc}. Expect 1+, got {arg}.',
        notFoundStack: 'Not found stack at {loc} called {arg}.',
        stackEmpty: 'Pop empty stack at {loc} called {arg}.',
        notFoundTargets: 'Not found any target to transfer.',
        NotCurrentMap: 'Call to SmallRogue at {loc} is not on current map.'
    }

    // 将 args 填入 template 并返回
    SmallRogue.f = function f(template, args) {
        var str = template;
        for (var key in args) {
            str = str.replace(new RegExp('{' + key + '}', 'gi'));
        }
        return str;
    };

    // 返回 [地图ID, 事件ID, 事件页下标, 事件指令下标]
    // 如果当前事件的执行位置不是当前地图, 报错
    function getLocation(self) {
        if (self.isOnCurrentMap()) {
            var event = $gameMap.event(self._eventId);
            var pageIndex = event._pageIndex;
            return [self._mapId, self._eventId, pageIndex, self._index];
        }
        throw new Error(f(err.NotCurrentMap, {
            loc: [self._mapId, self._eventId]
        }));
    }

    // 判定下一个事件是否为场所移动事件
    function isTransferEventNext(self) {
        var command = self._list[self._index + 1];
        if (command) {
            // 普通 [场所移动] 事件
            if (command.code === 201) return true;
            // [插件指令] 事件，和 [qMovement transfer ...] 兼容
            if (command.code === 356) {
                var args = command.parameters[0].split(' ');
                if (args[0] === 'qMovement' &&
                    args[1] === 'transfer') return true;
            }
        }
        return false;
    }

    // 获取下一条事件并跳过他
    function fetchAndSkipNextEvent(self) {
        var command = self._list[self._index + 1];
        self._index++;
        return command;
    }

    // '1' -> 1
    // 'v1' -> $gameVariables.value(1)
    function parseWeight(str) {
        if (str[0] === 'v') {
            var id = parseInt(str.substring(1));
            if (Number.isNaN(id) || id < 0) {
                return NaN;
            } else {
                return $gameVariables.value(id);
            }
        } else {
            return parseInt(str);
        }
    }

    // 将接下来的场所移动事件添加到候选区
    SmallRogue.add = function(self, rawWeights) {
        var loc = getLocation(self);
        var weights = rawWeights.split(',').map(function(str) {
            var weight = parseWeight(str);
            if (Number.isNaN(weight)) {
                throw new Error(f(err.invalidInteger, {
                    loc: loc,
                    arg: str
                }));
            }
            return weight;
        });
        weights.forEach(function(weight) {
            if (isTransferEventNext(self)) {
                var command = fetchAndSkipNextEvent(self);
                SmallRogue.current.push({
                    weight: weight,
                    command: command,
                    loc: loc
                });
            } else {
                throw new Error(f(err.invalidTransferEvent, {
                    loc: loc,
                    arg: JsonEx.stringify(self._list[self._index + 1])
                }));
            }
        });
    };

    SmallRogue.a = SmallRogue.i = SmallRogue.add;

    // 按权重在 candidates 里取一个
    function sample(candidates) {
        var sum, chosen, random;
        sum = 0;
        candidates.forEach(function(e) {
            sum += e.weight;
        });

        random = Math.random() * sum;
        sum = 0;
        candidates.forEach(function(e) {
            sum += e.weight;
            if (!chosen && random < sum) {
                chosen = e;
            }
        });

        return chosen;
    }

    // 从普通场所移动事件的参数中找到地图 ID
    function resolveMapIdFromCommand201Params(parameters) {
        var mapId;
        if (parameters[0] === 0) {  // 直接移动
            mapId = parameters[1];
        } else {                    // 间接移动
            mapId = $gameVariables.value(parameters[1]);
        }
        return mapId;
    }

    // 从 command 里取出目标地图的 ID
    function getTargetMapId(command) {
        // 普通场所移动事件的情况
        if (command.code === 201) {
            return resolveMapIdFromCommand201Params(command.parameters);
        }
        // qMovement 的情况
        if (command.code === 356) {
            var args = command.parameters[0].split(' ');
            return parseInt(args[2]);
        }
    }

    function nextMapId(map) {
        map.currentMapId += 1;
        return map.currentMapId;
    }

    // 同一个模板地图最多生成多少次新地图，这个数字未必准确，因为存在没有地图可生成的情况
    SmallRogue.MaxNewMaps = 3;

    // 获取场所移动目的地地图 ID 列表，他们都由 refMapId 生成
    // 其中有一个特殊的 0, 表示生成新地图
    function getTargets(map, refMapId) {
        var targets = [];
        map.forEach(function(refId, newId) {
            if (refId === refMapId) {
                targets.push(parseInt(newId));
            }
        });
        if (targets.length < SmallRogue.MaxNewMaps) {
            targets.push(0);
        }
        return targets;
    }

    // 将场所移动事件 command 里的目的地改成 mapId
    function injectMapId(command, mapId) {
        command = JsonEx.parse(JsonEx.stringify(command));
        // 普通场所移动事件的情况
        if (command.code === 201) {
            var parameters = command.parameters;
            if (parameters[0] === 0) {  // 直接移动
                parameters[1] = mapId;
            } else {                    // 间接移动, 修改为直接移动
                parameters.splice(0, 2, 0, mapId);
                parameters[2] = $gameVariables.value(parameters[2]);
                parameters[3] = $gameVariables.value(parameters[3]);
            }
        }
        // qMovement 的情况
        if (command.code === 356) {
            var args = command.parameters[0].split(' ');
            args[2] = mapId;
            command.parameters[0] = args.join(' ');
        }
        return command;
    }

    // 发起场所移动，这里实际上是把刚才 add 进来的场所移动事件再吐回去
    SmallRogue.transfer = function(self) {
        var loc = getLocation(self);
        var candidates = SmallRogue.current;
        SmallRogue.current = [];
        if (candidates.length === 0) {
            throw new Error(f(err.notFoundTargets, {
                loc: loc
            }));
        }
        var item = sample(candidates);
        var refMapId = getTargetMapId(item.command);
        if (Number.isNaN(refMapId) || refMapId < 0) {
            throw new Error(f(err.invalidMapId, {
                loc: loc,
                arg: refMapId
            }));
        }
        var map = $gameSystem.getSmallRogueMap();
        var targets = getTargets(map, refMapId);
        var target = targets[~~(Math.random() * targets.length)];
        if (target === 0) {
            target = nextMapId(map);
            map.set(target, refMapId);
        }
        var result = injectMapId(item.command, target);
        var list = self._list.slice();
        list[self._index] = result;
        self._list = list;
        self._index--;

        var args = [];
        var firstAddLocation = candidates[0].loc;
        firstAddLocation.forEach(function(e) {
            args.push(e);
        });
        args.push({
            command: result,
            from: loc
        });
        map.set.apply(map, args);
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
                items.forEach(function(item) {
                    SmallRogue.current.push(item);
                });
            } else {
                throw new Error(err.stackEmpty, {
                    loc: getLocation(self),
                    arg: name
                });
            }
        } else {
            throw new Error(err.notFoundStack, {
                loc: getLocation(self),
                arg: name
            });
        }
    };

    SmallRogue['>>'] = SmallRogue.pop;

    var _pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _pluginCommand.call(this, command, args);
        if (command === 'SmallRogue') {
            SmallRogue[args[0]].call(SmallRogue, this, args[1]);
        }
    };

    var _loadMapData = DataManager.loadMapData;
    DataManager.loadMapData = function(mapId) {
        var map = $gameSystem.getSmallRogueMap();
        var exist = map.get(mapId);
        if (exist) {
            mapId = exist;
        }
        DataManager._mapId = mapId;
        _loadMapData.call(DataManager, mapId);
    };

    function findAndInject(dataMap, refMapId, mapId, x, y) {
        dataMap.events.forEach(function(e) {
            if (e && e.x === x && e.y === y) e.pages.forEach(function(page) {
                var counter = 0;
                var firstAddLocationIndex;
                var targetCommand;
                page.list.forEach(function(command, index) {
                    if (!targetCommand) {
                        if (command.code === 356) {
                            var args = command.parameters[0].split(' ');
                            if (args[0] === 'SmallRogue' && args[1] === 'add') {
                                if (!firstAddLocationIndex) {
                                    firstAddLocationIndex = index;
                                }
                                counter = args[2].split(',').length;
                            }
                        }
                        if (counter > 0) {
                            counter--;
                            var target = getTargetMapId(command);
                            if (target === refMapId) {
                                targetCommand = command;
                            }
                        }
                    }
                });
                if (targetCommand) {
                    targetCommand = injectMapId(targetCommand, mapId);
                    page.list[firstAddLocationIndex] = targetCommand;
                }
            });
        });
    }

    function getTargetXY(command) {
        if (command.code === 201) {
            return command.parameters.slice(2, 4);
        }
        if (command.code === 356) {
            // 像素位置，直接除以一个图块大小求事件坐标了 = =
            var args = command.parameters[0].split(' ');
            return [
                Math.floor(parseInt(args[3]) / 48),
                Math.floor(parseInt(args[4]) / 48)
            ];
        }
    }

    // 在读入地图时，修改地图数据:
    // 已经存在此脚本动过的事件的，直接替换成相关事件指令
    // 如果是作为目标地图，尝试修改出返回的事件
    var _onLoad = DataManager.onLoad;
    DataManager.onLoad = function(object) {
        _onLoad.call(this, object);
        if (object === $dataMap) {
            var mapId = DataManager._mapId;
            var map = $gameSystem.getSmallRogueMap();
            map.forEach(function(value, key) {
                var loc = key.split(',');
                if (loc.length === 4) {
                    if (parseInt(loc[0]) === mapId) {
                        var eventId = parseInt(loc[1]);
                        var pageIndex = parseInt(loc[2]);
                        var index = parseInt(loc[3]);
                        object.events.forEach(function(e) {
                            if (e && e.id === eventId) {
                                var page = e.pages[pageIndex];
                                page[index] = value.command;
                            }
                        });
                    }
                    if (getTargetMapId(value.command) === mapId) {
                        var fromMapId = value.from[0];
                        var fromRefMapId = map.get(fromMapId);
                        var xy = getTargetXY(value.command);
                        findAndInject(object, fromRefMapId, fromMapId, xy[0], xy[1]);
                    }
                }
            });
        }
    };
})();
