class CreateFlashcards < ActiveRecord::Migration[7.1]
  def change
    create_table :flashcards do |t|
      t.references :deck, null: false, foreign_key: true
      t.string :term, null: false, limit: 500
      t.string :definition, null: false, limit: 500
      t.integer :position, null: false, default: 0

      t.timestamps
    end

    add_index :flashcards, [:deck_id, :position]
  end
end
