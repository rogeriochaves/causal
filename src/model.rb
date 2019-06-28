require_relative 'node'

class Model
  attr_reader :nodes

  def initialize(&block)
    @nodes = block.parameters.map do |param|
      node_name = param[1]
      Node.new(node_name)
    end
    block.call(@nodes)
  end

  def find_node(name)
    @nodes.find {|node| node.name == name} or raise "Could not find node #{name}"
  end

  def run(query)
    # return Estimand.new() if query fits in self.assumptions
    # raise "Query cannot be answered given current assumptions"
  end

  def to_s
    @nodes.map(&:to_s).join("\n")
  end
end