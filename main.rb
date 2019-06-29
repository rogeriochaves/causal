require_relative 'src/model'
require_relative 'src/query'

puts """This is the causal model:

                               ,---> soldier_a_shooting --,
  governor --> general_order --|                          |--> prisioner_death
                               `---> soldier_b_shooting --´

"""

model = Model.new do |governor, general_order, soldier_a_shooting, soldier_b_shooting, prisioner_death|
  governor.causes(general_order)
  general_order.causes(soldier_a_shooting)
  general_order.causes(soldier_b_shooting)
  soldier_a_shooting.causes(prisioner_death)
  soldier_b_shooting.causes(prisioner_death)
end

query = Query.new(model).run do |governor, general_order|
  general_order.observe 1
  governor.chance
end
puts "If I know the general gave the order, does it mean the governor took the decision? P(governor|general_order) = #{query}"

query = Query.new(model).run do |governor, prisioner_death|
  governor.observe 1
  prisioner_death.chance
end
puts "If I know the governor decided, does it mean prisioner died? P(prisioner_death|governor) = #{query}"

query = Query.new(model).run do |prisioner_death, soldier_a_shooting, soldier_b_shooting|
  prisioner_death.observe 1
  soldier_a_shooting.chance * soldier_b_shooting.chance
end
puts "If the prisioner died, does it mean both soldiers shoot? P(soldier_a_shooting|prisioner_death) * P(soldier_b_shooting|prisioner_death) = #{query}"

query = Query.new(model).run do |soldier_a_shooting, soldier_b_shooting|
  soldier_a_shooting.intervention! 1
  soldier_b_shooting.chance
end
puts "If I force soldier A to shoot, will the other soldier also shoot? P(soldier_b_shooting|do(soldier_a_shooting)) = #{query}"

query = Query.new(model).run do |prisioner_death, governor|
  governor.intervention! 0
  prisioner_death.chance
end
puts "Would the prisioner be dead had the governor not given the order? P(prisioner_death|do(not governor)) = #{query}"