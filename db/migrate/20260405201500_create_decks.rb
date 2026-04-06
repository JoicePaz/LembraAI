class CreateDecks < ActiveRecord::Migration[7.1]
  def change
    create_table :decks do |t|
      t.string :title, null: false, limit: 80
      t.string :description, limit: 500

      t.timestamps
    end
  end
end
