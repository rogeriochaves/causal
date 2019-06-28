require_relative "../src/model"

describe Model do
  it "creates a model with the causal assumptions" do
    model = Model.new do |foo, bar|
      foo.causes(bar)
    end

    expect(model.nodes.map(&:name)).to eq [:foo, :bar]
  end
end