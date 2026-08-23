import { afterAll, beforeAll } from 'vitest'
import { exec } from "child_process"

export function setupDatabase() {

    beforeAll(async () => {
       
        exec("pnpm db:generate && pnpm db:migrate", (error, stdout, stderr) => {
            if (error) {
                console.error("Error: ", error)
            }

            if (stderr) {
                console.error("Std Error: ", stderr)
            }

            if (stdout) {
                console.log("Std out: ", stdout)
            }
        })
    })

    afterAll( () => {
        
        exec("pnpm db:reset --override", (error, stdout, stderr) => {
            if (error) {
                console.error("Error: ", error)
            }

            if (stderr) {
                console.error("Std Error: ", stderr)
            }

            if (stdout) {
                console.log("Std out: ", stdout)
            }
        })
        
    })

}