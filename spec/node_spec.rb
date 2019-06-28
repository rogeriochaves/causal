require_relative "../src/node"

describe Node do
  it "sets parents and children properly" do
    foo = Node.new("foo")
    bar = Node.new("bar")
    foo.causes(bar)

    expect(foo.children).to eq [bar]
    expect(bar.parents).to eq [foo]
  end

  it "allows multiple children and multiple parents" do
    foo = Node.new("foo")
    bar = Node.new("bar")
    baz = Node.new("baz")
    foo.causes(bar)
    foo.causes(baz)
    bar.causes(baz)

    expect(foo.children).to eq [bar, baz]
    expect(baz.parents).to eq [foo, bar]
  end

  it "changes the self value and affects all the children recursively when there is a intervention" do
    zero = Node.new("zero")
    foo = Node.new("foo")
    bar = Node.new("bar")
    baz = Node.new("baz")
    qux = Node.new("qux")
    zero.causes(foo)
    foo.causes(bar)
    foo.causes(baz)
    baz.causes(qux)
    foo.intervention! 1

    expect(zero.value).to eq nil
    expect(foo.value).to eq 1
    expect(bar.value).to eq 1
    expect(baz.value).to eq 1
    expect(qux.value).to eq 1
  end

  it "changes parents and children values recursively when there is an observation" do
    foo = Node.new("foo")
    bar = Node.new("bar")
    baz = Node.new("baz")
    qux = Node.new("qux")
    foo.causes(bar)
    foo.causes(baz)
    baz.causes(qux)
    baz.observe 1

    expect(foo.value).to eq 1
    expect(bar.value).to eq 1
    expect(baz.value).to eq 1
    expect(qux.value).to eq 1
  end
end