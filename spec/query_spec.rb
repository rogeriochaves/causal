require_relative "../src/query"

describe Query do
  model = Model.new do |foo, bar, baz|
    foo.causes(bar)
    bar.causes(baz)
  end

  it "queries observational data" do
    query = Query.new(model).run do |foo, bar, baz|
      bar.observe 1
      foo.value == 1 and baz.value == 1
    end
    expect(query).to eq true
  end

  it "queries interventional data" do
    query = Query.new(model).run do |foo, bar, baz|
      bar.intervention! 1
      foo.value == 0
    end
    expect(query).to eq true
  end

  it "vaccines example" do
    model = Model.new do |vaccination, reaction, smallpox, death|
      vaccination.causes(reaction, effect: 0.01)
      vaccination.causes(smallpox, effect: 0)
      reaction.causes(death, effect: 0.01)
      smallpox.causes(death, effect: 0.02)
    end
    query = Query.new(model).run do |vaccination, death|
      vaccination.observe 1
      death.value
    end
    expect(query).to eq 0.0001
  end
end
