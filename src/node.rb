class Node
  attr_reader :name, :parents, :children, :value

  def initialize(name)
    @name = name
    @parents = []
    @children = []
    @value = 0
  end

  def children_nodes
    @children.map { |x| x[:node] }
  end

  def parent_nodes
    @parents.map { |x| x[:node] }
  end

  def causes(node, opts = {})
    return if has_children? node
    @children << { node: node, effect: opts[:effect] || 1, changed: false }
    node.is_caused_by self, opts
  end

  def is_caused_by(node, opts = {})
    return if has_parent? node
    @parents << { node: node, effect: opts[:effect] || 1 }
    node.causes self, opts
  end

  def intervention!(value)
    @value = value
    propagate_children_effects(value)
  end

  def observe(value)
    @value = value
    propagate_children_effects(value)
    @parents.each do |parent|
      parent[:node].observe [((1 - parent[:node].value) / value), 1].min
    end
  end

  def to_s
    "#{@name} => [" + children_nodes.map(&:name).join(", ") + "]"
  end

  private

  def has_children?(node)
    children_nodes.include? node
  end

  def has_parent?(node)
    parent_nodes.include? node
  end

  def propagate_children_effects(value)
    @children.each do |child|
      return if child[:changed]
      child[:node].intervention! [(child[:node].value + value * child[:effect]), 1].min
      child[:changed] = true
    end
  end
end
