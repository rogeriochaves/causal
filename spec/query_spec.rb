require_relative "../src/query"

describe Query do
  model = Model.new do |foo, bar, baz|
    foo.causes(bar)
    bar.causes(baz)
  end

  it "queries observational data" do
    query = Query.new(model).run do |foo, bar, baz|
      bar.observe 1
      foo.chance == 1 and baz.chance == 1
    end
    expect(query).to eq true
  end

  it "queries interventional data" do
    query = Query.new(model).run do |foo, bar, baz|
      bar.intervention! 1
      foo.chance == 0
    end
    expect(query).to eq true
  end

  it "vaccines example" do
    model = Model.new do |vaccination, reaction, smallpox, death|
      vaccination.causes(reaction, effect: 0.01)
      vaccination.causes(smallpox, effect: -1)
      reaction.causes(death, effect: 0.01)
      smallpox.causes(death, effect: 0.02)
    end

    smallpox_death_chance = Query.new(model).run do |smallpox, death|
      smallpox.observe 1
      death.chance
    end
    expect(smallpox_death_chance).to eq 0.02

    death_chance_with_vaccine = Query.new(model).run do |vaccination, death|
      vaccination.observe 1
      death.chance
    end
    expect(death_chance_with_vaccine).to eq 0.0001
  end
end
