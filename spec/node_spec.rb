require_relative "../src/node"

describe Node do
  it "sets parents and children properly" do
    foo = Node.new("foo")
    bar = Node.new("bar")
    foo.causes(bar)

    expect(foo.children_nodes).to eq [bar]
    expect(bar.parent_nodes).to eq [foo]
  end

  it "allows multiple children and multiple parents" do
    foo = Node.new("foo")
    bar = Node.new("bar")
    baz = Node.new("baz")
    foo.causes(bar)
    foo.causes(baz)
    bar.causes(baz)

    expect(foo.children_nodes).to eq [bar, baz]
    expect(baz.parent_nodes).to eq [foo, bar]
  end

  it "changes the self chance and affects all the children recursively when there is a intervention" do
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

    expect(zero.chance).to eq 0
    expect(foo.chance).to eq 1
    expect(bar.chance).to eq 1
    expect(baz.chance).to eq 1
    expect(qux.chance).to eq 1
  end

  it "changes parents and children chances recursively when there is an observation" do
    foo = Node.new("foo")
    bar = Node.new("bar")
    baz = Node.new("baz")
    qux = Node.new("qux")
    foo.causes(bar)
    foo.causes(baz)
    baz.causes(qux)
    baz.observe 1

    expect(foo.chance).to eq 1
    expect(bar.chance).to eq 1
    expect(baz.chance).to eq 1
    expect(qux.chance).to eq 1
  end

  it "allows different effect from different nodes from intervention" do
    foo = Node.new("foo")
    bar = Node.new("bar")
    baz = Node.new("baz")
    foo.causes(baz, :effect => 0.01)
    bar.causes(baz, :effect => 0.02)
    foo.intervention! 1
    bar.intervention! 1

    expect(baz.chance).to eq 0.03
  end

  it "allows different effect from different nodes and prevents duplicate propagation" do
    zero = Node.new("zero")
    foo = Node.new("foo")
    bar = Node.new("bar")
    baz = Node.new("baz")
    zero.causes(foo)
    zero.causes(bar)
    foo.causes(baz, :effect => 0.01)
    bar.causes(baz, :effect => 0.02)
    zero.observe 1
    foo.observe 1

    expect(baz.chance).to eq 0.03
  end

  it "predicts chance from previous to have caused the effect" do
    foo = Node.new("foo")
    bar = Node.new("bar")
    foo.causes(bar, :effect => 0.01)
    bar.observe(0.01)

    expect(foo.chance).to eq 1
  end
end
