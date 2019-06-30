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

  it "soldiers example" do
    model = Model.new do |governor, general_order, soldier_a_shooting, soldier_b_shooting, prisioner_death|
      governor.causes(general_order)
      general_order.causes(soldier_a_shooting)
      general_order.causes(soldier_b_shooting)
      soldier_a_shooting.causes(prisioner_death)
      soldier_b_shooting.causes(prisioner_death)
    end

    governor_causes_prisioner_death = Query.new(model).run do |governor, prisioner_death|
      governor.observe 1
      prisioner_death.chance
    end
    expect(governor_causes_prisioner_death).to eq 1

    both_shooting_chance = Query.new(model).run do |prisioner_death, soldier_a_shooting, soldier_b_shooting|
      prisioner_death.observe 1
      soldier_a_shooting.chance * soldier_b_shooting.chance
    end
    expect(both_shooting_chance).to eq 1

    soldier_b_follow_a_chance = Query.new(model).run do |soldier_a_shooting, soldier_b_shooting|
      soldier_a_shooting.intervention! 1
      soldier_b_shooting.chance
    end
    expect(soldier_b_follow_a_chance).to eq 0

    prisioner_would_be_dead_anyway = Query.new(model).run do |governor, soldier_a_shooting, prisioner_death|
      governor.observe(1)
      soldier_a_shooting.intervention!(0)
      prisioner_death.chance
    end
    expect(prisioner_would_be_dead_anyway).to eq 1
  end
end
