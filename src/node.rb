class Node
  attr_reader :name, :parents, :children, :chance

  def initialize(name)
    @name = name
    @parents = []
    @children = []
    @chance = 0
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

  def intervention!(chance)
    propagate_effect(chance)
    @interveined = true
  end

  def propagate_effect(chance)
    return if @interveined
    @chance = chance
    propagate_children_effects(chance)
  end

  def observe(chance)
    @chance = chance
    propagate_children_effects(chance)
    @parents.each do |parent|
      parent[:node].observe [(1 / parent[:effect]), 1].min
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

  def propagate_children_effects(chance)
    @children.each do |child|
      next if child[:changed]
      new_chance = (child[:node].chance + chance * child[:effect])
      child[:node].propagate_effect [[new_chance, 1].min, 0].max
      child[:changed] = true
    end
  end
end
