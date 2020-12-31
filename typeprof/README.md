[TypeProf][] can give us methods & variables' types in the syntax of [RBS][].
Let's try to make some editor plugin with them!

## Infer!

First of all, we need to implement _hover info_ or _smart completion_.

To be precise, given code below:
(`|` is the caret position, `[|xxx|]` means user is hovering `xxx`)

```rb
[].|            # give me all instance methods of Array
[].push(|)      # give me the method info of Array#push
[].[|push|](42) # give me the method info of Array#push
a = []; [|a|]   # give me "a is Array"
```

To make it possible, we need to get the type of things
left to caret / token under hovering.

### Easy Mode

Try to get variables (or expressions which can be assigned to variable), then let typeprof output the type of the variable.

In fact, in ruby every identifier may be a method _iff_ there's no variable named it. `f` is maybe the variable `f` or a calling to `f()`. We can not tell the difference without analyzing the context (which is hard). So here we choose the easy mode: 

> here, `identifier` is any word token which is not part of other literals (like string or symbol)

```rb
if there is leading '.' before the token then
    the type of this token must be infered from things before '.'
    so rewrite "A.new.f.token" to "($_infer_1=A.new.f).token"
    read type from `typeprof`.find('$_infer_1') as class name
    then read method 'token' type
else # there is no leading '.'
    if there is '(' or another token following the token then
        this token must be a method calling
    else
        try rewriting "token.abc" to "($_infer_1=token).abc"
        try rewriting "token.(abc)" to "($_infer_1=token).(abc)"
        try rewriting "token[abc]" to "($_infer_1=token)[abc]"
        try rewriting "token" to "($_infer_1=token)"
    end
end
```

### Normal Mode

Add baisc context analysing.

[RBS]: https://github.com/ruby/rbs
[TypeProf]: https://github.com/ruby/typeprof
