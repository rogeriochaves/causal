class Query
  def initialize(model)
    @model = model
  end

  def run(&block)
    cloned_model = Marshal.load(Marshal.dump(@model))
    @nodes = block.parameters.map do |param|
      node_name = param[1]
      cloned_model.find_node node_name
    end
    block.call(@nodes)
  end
end