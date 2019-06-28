class Node
  attr_reader :name, :parents, :children, :value

  def initialize(name)
    @name = name
    @parents = []
    @children = []
    @value = 0
  end

  def causes(node)
    return if @children.include? node
    @children << node
    node.is_caused_by self
  end

  def is_caused_by(node)
    return if @parents.include? node
    @parents << node
    node.causes self
  end

  def intervention!(value)
    @value = value
    @children.each do |child|
      child.intervention! value
    end
  end

  def observe(value)
    @value = value
    @children.each do |child|
      child.intervention! value
    end
    @parents.each do |parent|
      parent.observe value
    end
  end

  def to_s
    "#{@name} => [" + @children.map(&:name).join(", ") + "]"
  end
end