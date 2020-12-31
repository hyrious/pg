class A
  class B
    def g() = __method__
  end
  def f() = 42
  class B
    def c() = A.new.f
  end
end

$a = A.new.f
