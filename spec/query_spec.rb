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
end